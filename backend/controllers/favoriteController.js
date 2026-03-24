import db from "../config/db.js";
import pool from "../config/db.js";
// 💖 Add a product to favorites
export const addFavorite = async (req, res) => {
  try {
    const { client_id, product_id } = req.body;

    if (!client_id || !product_id) {
      return res.status(400).json({ message: "Missing client_id or product_id" });
    }

    // 1️⃣ Check if already in favorites
    const [existing] = await db.execute(
      "SELECT id FROM favorites WHERE client_id = ? AND product_id = ?",
      [client_id, product_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Already in favorites" });
    }

    // 2️⃣ Add to favorites
    await db.execute(
      "INSERT INTO favorites (client_id, product_id) VALUES (?, ?)",
      [client_id, product_id]
    );

    res.status(201).json({ message: "Product added to favorites successfully" });
  } catch (err) {
    console.error("❌ Error adding favorite:", err);
    res.status(500).json({ message: "Failed to add favorite" });
  }
};

// 💔 Remove from favorites
export const removeFavorite = async (req, res) => {
  try {
    const { client_id, product_id } = req.body;

    if (!client_id || !product_id) {
      return res.status(400).json({ message: "Missing client_id or product_id" });
    }

    const [result] = await db.execute(
      "DELETE FROM favorites WHERE client_id = ? AND product_id = ?",
      [client_id, product_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Favorite not found" });
    }

    res.json({ message: "Product removed from favorites" });
  } catch (err) {
    console.error("❌ Error removing favorite:", err);
    res.status(500).json({ message: "Failed to remove favorite" });
  }
};

// 📋 Get all favorites for a client
export const getFavorites = async (req, res) => {
  try {
    const { client_id } = req.query;

    if (!client_id) {
      return res.status(400).json({ message: "Missing client_id" });
    }

    console.log('🔍 Fetching favorites. ClientId:', client_id);

    const [favorites] = await pool.execute(
      `
      SELECT p.*, c.name as category_name, c.image as category_image
      FROM favorites f
      JOIN products p ON f.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE f.client_id = ? AND p.active = TRUE AND c.active = TRUE
      ORDER BY f.created_at DESC
      `,
      [client_id]
    );

    console.log('✅ Total favorites found:', favorites.length);

    const simpleFavorites = favorites.map(product => ({
      ...product,
      price: parseFloat(product.price),
      rating: parseFloat(product.rating) || 0,
      promo: Boolean(product.promo),
      is_popular: Boolean(product.is_popular),
      active: Boolean(product.active),
      has_offer: false,
      discount_applied: false,
      offer_info: null
    }));

    const userOfferQuery = `
      SELECT DISTINCT o.* 
      FROM offer_usages uoa
      JOIN offers o ON uoa.offer_id = o.id
      WHERE uoa.user_id = ? 
        AND o.is_active = TRUE 
        AND o.start_at <= NOW() 
        AND o.end_at > NOW()
      ORDER BY o.created_at DESC
      LIMIT 1
    `;

    const [userOffers] = await pool.execute(userOfferQuery, [client_id]);

    if (userOffers.length === 0) {
      console.log(`ℹ️ User ${client_id} has NO active applied offers - returning favorites normally`);

      const [results] = await pool.execute(`SELECT restaurant_name FROM restaurant_settings LIMIT 1`);
      const restaurant_name = results[0]?.restaurant_name || 'Restaurant';

      return res.json({
        success: true,
        favorites: simpleFavorites,
        restaurant_name,
        user_context: {
          user_id: client_id,
          has_active_offer: false
        }
      });
    }

    const appliedOffer = userOffers[0];

    let discountValue;
    if (appliedOffer.discount === null || appliedOffer.discount === undefined) {
      const [results] = await pool.execute(`SELECT restaurant_name FROM restaurant_settings LIMIT 1`);
      const restaurant_name = results[0]?.restaurant_name || 'Restaurant';

      return res.json({
        success: true,
        favorites: simpleFavorites,
        restaurant_name,
        user_context: {
          user_id: client_id,
          has_active_offer: false,
          error: 'Invalid offer data - discount value missing'
        }
      });
    }

    discountValue = parseFloat(appliedOffer.discount);
    if (isNaN(discountValue)) {
      const [results] = await pool.execute(`SELECT restaurant_name FROM restaurant_settings LIMIT 1`);
      const restaurant_name = results[0]?.restaurant_name || 'Restaurant';

      return res.json({
        success: true,
        favorites: simpleFavorites,
        restaurant_name,
        user_context: {
          user_id: client_id,
          has_active_offer: false,
          error: 'Invalid discount value in offer'
        }
      });
    }

    console.log(`✅ Using discount value: ${discountValue} (${appliedOffer.discount_type})`);

    const offerProductsQuery = `
      SELECT op.product_id, op.limited_use, op.times_used
      FROM offer_products op
      JOIN products p ON op.product_id = p.id
      WHERE op.offer_id = ? AND p.active = TRUE
    `;
    const [offerProducts] = await pool.execute(offerProductsQuery, [appliedOffer.id]);
    const offerProductIds = new Set(offerProducts.map(p => p.product_id));
    const offerProductMap = new Map(offerProducts.map(p => [p.product_id, p]));

    const usedProductsQuery = `
      SELECT product_id, SUM(usage_count) as total_units_purchased
      FROM offer_usages 
      WHERE user_id = ? AND offer_id = ?
      GROUP BY product_id
    `;
    const [usedProducts] = await pool.execute(usedProductsQuery, [client_id, appliedOffer.id]);
    const usedProductMap = new Map(usedProducts.map(p => [p.product_id, p.total_units_purchased]));

    const processedFavorites = favorites.map(product => {
      const originalPrice = parseFloat(product.price);
      const isInOffer = offerProductIds.has(product.id);

      if (!isInOffer) {
        return {
          ...product,
          price: originalPrice,
          rating: parseFloat(product.rating) || 0,
          promo: Boolean(product.promo),
          is_popular: Boolean(product.is_popular),
          active: Boolean(product.active),
          has_offer: false,
          discount_applied: false,
          offer_info: null
        };
      }

      const offerProduct = offerProductMap.get(product.id);
      const maxUses = offerProduct?.limited_use ?? null;
      const timesUsed = offerProduct?.times_used || 0;
      const userUsageCount = usedProductMap.get(product.id) || 0;

      const globalLimitNotReached = maxUses === null || timesUsed < maxUses;
      const userHasNotUsedProduct = userUsageCount < 1;
      const canUseOffer = globalLimitNotReached && userHasNotUsedProduct;

      let calculatedDiscountedPrice = originalPrice;
      if (appliedOffer.discount_type === 'percentage') {
        calculatedDiscountedPrice = originalPrice * (1 - discountValue / 100);
      } else if (appliedOffer.discount_type === 'fixed') {
        calculatedDiscountedPrice = Math.max(0.01, originalPrice - discountValue);
      }
      calculatedDiscountedPrice = parseFloat(calculatedDiscountedPrice.toFixed(2));

      let reason = '';
      if (!globalLimitNotReached) {
        reason = 'Global limit reached';
      } else if (!userHasNotUsedProduct) {
        reason = 'User already used this product';
      }

      const offerInfo = {
        offer_id: appliedOffer.id,
        offer_name: appliedOffer.name,
        discount_type: appliedOffer.discount_type,
        discount_value: discountValue,
        original_price: originalPrice,
        discounted_price: calculatedDiscountedPrice,
        can_use_offer: canUseOffer,
        times_used: timesUsed,
        max_uses: maxUses,
        remaining_uses: maxUses ? maxUses - timesUsed : null,
        user_has_used: userUsageCount >= 1,
        user_usage_count: userUsageCount,
        valid_until: appliedOffer.end_at,
        description: appliedOffer.description,
        ...(canUseOffer ? {} : { reason })
      };

      return {
        ...product,
        price: originalPrice,
        original_price: originalPrice,
        final_price: canUseOffer ? calculatedDiscountedPrice : originalPrice,
        rating: parseFloat(product.rating) || 0,
        promo: Boolean(product.promo),
        is_popular: Boolean(product.is_popular),
        active: Boolean(product.active),
        has_offer: true,
        discount_applied: canUseOffer,
        offer_info: offerInfo
      };
    });

    const favoritesWithActiveDiscounts = processedFavorites.filter(p => p.discount_applied).length;
    const favoritesInOfferButNoDiscount = processedFavorites.filter(p => p.has_offer && !p.discount_applied).length;

    const [results] = await pool.execute(`SELECT restaurant_name FROM restaurant_settings LIMIT 1`);
    const restaurant_name = results[0]?.restaurant_name || 'Restaurant';

    return res.json({
      success: true,
      favorites: processedFavorites,
      restaurant_name,
      user_context: {
        user_id: client_id,
        has_active_offer: true,
        offer_details: {
          id: appliedOffer.id,
          name: appliedOffer.name,
          discount_type: appliedOffer.discount_type,
          discount_value: discountValue,
          valid_until: appliedOffer.end_at,
          total_favorites_in_offer: processedFavorites.filter(p => p.has_offer).length,
          available_favorites: favoritesWithActiveDiscounts,
          unavailable_favorites: favoritesInOfferButNoDiscount
        }
      }
    });

  } catch (err) {
    console.error("❌ Error fetching favorites:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch favorites",
      error: err.message
    });
  }
};
