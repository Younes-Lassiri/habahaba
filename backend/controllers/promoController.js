import pool from "../config/db.js";
import jwt from 'jsonwebtoken';
// Get all active promo codes

export const getPromoCodes = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const [promoCodes] = await connection.execute(
      `SELECT 
        id, code, title, description, discount_type, discount_value, 
        min_order_amount, max_discount, valid_from, valid_until, 
        usage_limit, used_count, is_active, color, badge, 
        created_at, updated_at
       FROM promo_codes 
       WHERE is_active = TRUE 
         AND (valid_from IS NULL OR valid_from <= NOW())
         AND (valid_until IS NULL OR valid_until >= NOW())
         AND (usage_limit IS NULL OR used_count < usage_limit)
       ORDER BY created_at DESC`
    );

    // 2. Clean Data Mapping
    // Ensures IDs are strings (for React keys) and numbers are floats for logic.
    const formattedCodes = promoCodes.map((code) => ({
      ...code,
      id: code.id.toString(),
      discount_value: parseFloat(code.discount_value || 0),
      min_order_amount: parseFloat(code.min_order_amount || 0),
      max_discount: code.max_discount ? parseFloat(code.max_discount) : null,
      used_count: parseInt(code.used_count || 0),
      usage_limit: code.usage_limit ? parseInt(code.usage_limit) : null,
    }));

    // 3. Response
    res.json({ 
      success: true, 
      count: formattedCodes.length,
      promoCodes: formattedCodes 
    });

  } catch (error) {
    console.error("❌ Error fetching promo codes:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error occurred while fetching promo codes" 
    });
  } finally {
    // 4. Guaranteed Connection Release
    // Using 'finally' ensures we never leak a connection, even if the code crashes.
    if (connection) connection.release();
  }
};

// Validate and apply promo code
export const validatePromoCode = async (req, res) => {
  let connection;
  try {
    const { code, subtotal } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Promo code is required" });
    }

    const currentSubtotal = parseFloat(subtotal);
    if (isNaN(currentSubtotal) || currentSubtotal <= 0) {
      return res.status(400).json({ success: false, message: "Invalid subtotal amount" });
    }

    connection = await pool.getConnection();

    // The SQL now does the EXACT same check as getPromoCodes
    const [codes] = await connection.execute(
      `SELECT * FROM promo_codes 
       WHERE code = ? 
       AND is_active = TRUE
       AND (valid_from IS NULL OR valid_from <= NOW())
       AND (valid_until IS NULL OR valid_until >= NOW())
       AND (usage_limit IS NULL OR used_count < usage_limit)`,
      [code.trim().toUpperCase()]
    );

    // If no result, it's either: Wrong code, Inactive, Expired, or Limit Reached
    if (codes.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "This code is invalid, expired, or has reached its usage limit" 
      });
    }

    const promoCode = codes[0];

    // Check minimum order amount
    const minAmount = parseFloat(promoCode.min_order_amount || 0);
    if (currentSubtotal < minAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Minimum order amount is ${minAmount} MAD` 
      });
    }

    // Calculate discount
    let discountAmount = 0;
    const discountVal = parseFloat(promoCode.discount_value || 0);
    const maxDiscount = promoCode.max_discount ? parseFloat(promoCode.max_discount) : null;

    if (promoCode.discount_type === 'percentage') {
      discountAmount = (currentSubtotal * discountVal) / 100;
      if (maxDiscount && discountAmount > maxDiscount) {
        discountAmount = maxDiscount;
      }
    } else if (promoCode.discount_type === 'fixed') {
      discountAmount = Math.min(discountVal, currentSubtotal);
    }

    res.json({
      success: true,
      promoCode: {
        id: promoCode.id, // Kept original type
        code: promoCode.code,
        title: promoCode.title,
        discountType: promoCode.discount_type,
        discountValue: discountVal,
        discountAmount: Number(discountAmount.toFixed(2)),
        maxDiscount: maxDiscount,
      },
    });

  } catch (error) {
    console.error("❌ Error validating promo code:", error);
    res.status(500).json({ success: false, message: "Server error" });
  } finally {
    if (connection) connection.release();
  }
};

export const getAllOffers = async (req, res) => {
  try {
    // Get user ID from query parameters (sent from frontend)
    const userId = req.query.userId;
    console.log('🔍 User ID in getAllOffers:', userId); // Debug log

    const query = `
      SELECT 
        o.*,
        op.product_id,
        op.limited_use,
        op.times_used,
        p.name as product_name,
        p.price as product_price,
        p.image as product_image,
        c.name as product_category,
        p.description as product_description,
        ${userId ? `EXISTS(
          SELECT 1 FROM offer_usages ou 
          WHERE ou.offer_id = o.id AND ou.user_id = ?
        ) as is_applied_by_user` : 'FALSE as is_applied_by_user'}
      FROM offers o
      LEFT JOIN offer_products op ON o.id = op.offer_id
      LEFT JOIN products p ON op.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      -- START OF ADDED CONDITION TO EXCLUDE INACTIVE/EXPIRED OFFERS
      WHERE o.is_active = TRUE
        AND o.start_at <= NOW() 
        AND o.end_at > NOW()
      -- END OF ADDED CONDITION
      ORDER BY o.created_at DESC
    `;

    // Use userId in query parameters if it exists
    const [results] = userId 
      ? await pool.query(query, [userId])
      : await pool.query(query);

    // Group products by offer
    const offersMap = new Map();

    results.forEach(row => {
      const offerId = row.id;
      
      if (!offersMap.has(offerId)) {
        offersMap.set(offerId, {
          id: row.id,
          name: row.name,
          discount_type: row.discount_type,
          discount: parseFloat(row.discount),
          image: row.image,
          description: row.description,
          start_at: row.start_at,
          end_at: row.end_at,
          is_active: Boolean(row.is_active),
          is_applied_by_user: Boolean(row.is_applied_by_user), // Track if user applied this offer
          created_at: row.created_at,
          updated_at: row.updated_at,
          products: []
        });
      }

      // Add product if it exists
      if (row.product_id) {
        const offer = offersMap.get(offerId);
        offer.products.push({
          product_id: row.product_id,
          product_name: row.product_name,
          product_price: parseFloat(row.product_price),
          product_image: row.product_image,
          product_category: row.product_category,
          product_description: row.product_description,
          limited_use: row.limited_use,
          times_used: row.times_used,
          remaining_uses: row.limited_use ? row.limited_use - row.times_used : null,
          is_available: row.limited_use ? row.times_used < row.limited_use : true
        });
      }
    });

    const offers = Array.from(offersMap.values());

    res.json({
      success: true,
      offers: offers,
      total: offers.length,
      user_authenticated: !!userId // Debug info
    });

  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offers'
    });
  }
};

// offers
export const applyOfferToAllProducts = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { offerId, userId } = req.body;

    // 1. Validate offer exists and is active
    const [offers] = await connection.execute(`
      SELECT o.* FROM offers o
      WHERE o.id = ? 
      AND o.is_active = TRUE 
      AND o.start_at <= NOW() 
      AND o.end_at > NOW()
    `, [offerId]);

    if (offers.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Offer not found or expired'
      });
    }

    const offer = offers[0];

    // 2. Get all products in this offer
    const [offerProducts] = await connection.execute(`
      SELECT op.*, p.name as product_name, p.price, p.image, c.name as category_name
      FROM offer_products op
      JOIN products p ON op.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE op.offer_id = ? AND p.active = TRUE
    `, [offerId]);

    if (offerProducts.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'No products available in this offer'
      });
    }

    const appliedProducts = [];
    const failedProducts = [];

    // 3. Apply offer to each available product
    for (const offerProduct of offerProducts) {
      // Check usage limit
      if (offerProduct.limited_use && offerProduct.times_used >= offerProduct.limited_use) {
        failedProducts.push({
          product_id: offerProduct.product_id,
          product_name: offerProduct.product_name,
          reason: 'Usage limit reached'
        });
        continue;
      }

      // Check if user already applied this offer to this product
      const [existingUsage] = await connection.execute(`
        SELECT * FROM offer_usages 
        WHERE user_id = ? AND offer_id = ? AND product_id = ?
      `, [userId, offerId, offerProduct.product_id]);

      if (existingUsage.length > 0) {
        failedProducts.push({
          product_id: offerProduct.product_id,
          product_name: offerProduct.product_name,
          reason: 'Already applied'
        });
        continue;
      }

      // Apply offer to this product
      await connection.execute(`
        INSERT INTO offer_usages (user_id, offer_id, product_id) 
        VALUES (?, ?, ?)
      `, [userId, offerId, offerProduct.product_id]);

      const discountedPrice = calculateDiscountedPrice(parseFloat(offerProduct.price), offer);

      appliedProducts.push({
        product_id: offerProduct.product_id,
        product_name: offerProduct.product_name,
        product_image: offerProduct.image,
        product_category: offerProduct.category_name,
        original_price: parseFloat(offerProduct.price),
        final_price: discountedPrice,
        discount_amount: parseFloat(offerProduct.price) - discountedPrice
      });
    }

    // If no products could be applied
    if (appliedProducts.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Could not apply offer to any products. All products may have reached their usage limits or you have already applied them.',
        data: {
          failed_products: failedProducts
        }
      });
    }

    await connection.commit();

    res.json({
      success: true,
      message: `🎉 Offer applied successfully! You can now enjoy discounts on ${appliedProducts.length} products.`,
      data: {
        offer: {
          id: offer.id,
          name: offer.name,
          discount_type: offer.discount_type,
          discount: parseFloat(offer.discount)
        },
        applied_products: appliedProducts,
        failed_products: failedProducts,
        total_applied: appliedProducts.length,
        total_failed: failedProducts.length
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error applying offer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply offer. Please try again.'
    });
  } finally {
    connection.release();
  }
};

// Helper function to calculate discounted price
const calculateDiscountedPrice = (originalPrice, offer) => {
  switch (offer.discount_type) {
    case 'percentage':
      return originalPrice * (1 - parseFloat(offer.discount) / 100);
    case 'fixed':
      return Math.max(0, originalPrice - parseFloat(offer.discount));
    case 'free_delivery':
      return originalPrice;
    default:
      return originalPrice;
  }
};
