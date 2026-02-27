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
  let connection;
  try {
    const { client_id } = req.query;

    if (!client_id) {
      return res.status(400).json({ message: "Missing client_id" });
    }

    connection = await pool.getConnection();

    console.log('🔍 Fetching favorites. ClientId:', client_id);

    // Get favorite products
    const [favorites] = await connection.execute(
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

    // Check if user has an active applied offer
    console.log(`\n🔍 Checking if user ${client_id} has an active applied offer...`);
    
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
    
    const [userOffers] = await connection.execute(userOfferQuery, [client_id]);

    // If no active applied offer, return favorites normally
    if (userOffers.length === 0) {
      console.log(`ℹ️ User ${client_id} has NO active applied offers - returning favorites normally`);
      
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

      const [results] = await connection.execute(
        `SELECT restaurant_name from restaurant_settings`,
      );

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
    
    // Validate discount value
    let discountValue;
    if (appliedOffer.discount === null || appliedOffer.discount === undefined) {
      console.error('❌ CRITICAL: discount is NULL or UNDEFINED in database!');
      
      // Return favorites without offers due to invalid data
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

      const [results] = await connection.execute(
        `SELECT restaurant_name from restaurant_settings`,
      );

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
    } else {
      discountValue = parseFloat(appliedOffer.discount);
      if (isNaN(discountValue)) {
        console.error('❌ CRITICAL: discount is not a valid number:', appliedOffer.discount);
        
        // Return favorites without offers due to invalid data
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

        const [results] = await connection.execute(
          `SELECT restaurant_name from restaurant_settings`,
        );

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
    }
    
    console.log(`✅ Using discount value: ${discountValue} (${appliedOffer.discount_type})`);

    // Get all products included in this offer WITH their times_used
    console.log(`\n🔍 Getting products included in offer ${appliedOffer.id}...`);
    
    const offerProductsQuery = `
      SELECT op.product_id, op.limited_use, op.times_used
      FROM offer_products op
      JOIN products p ON op.product_id = p.id
      WHERE op.offer_id = ? AND p.active = TRUE
    `;
    const [offerProducts] = await connection.execute(offerProductsQuery, [appliedOffer.id]);
    const offerProductIds = offerProducts.map(p => p.product_id);
    
    console.log(`✅ Offer contains ${offerProductIds.length} products`);

    // Check which products user has already purchased using this offer
    console.log(`\n🔍 Checking user's purchase history...`);
    
    const usedProductsQuery = `
      SELECT product_id, SUM(usage_count) as total_units_purchased
      FROM offer_usages 
      WHERE user_id = ? AND offer_id = ?
      GROUP BY product_id
    `;
    const [usedProducts] = await connection.execute(usedProductsQuery, [client_id, appliedOffer.id]);
    const usedProductMap = new Map(usedProducts.map(p => [p.product_id, p.total_units_purchased]));
    
    console.log(`✅ User has purchased ${usedProducts.length} products from this offer`);

    // Process favorites with offer logic
    console.log(`\n🔍 Processing favorites with offer logic...`);
    
    const processedFavorites = favorites.map(product => {
      const originalPrice = parseFloat(product.price);
      const isInOffer = offerProductIds.includes(product.id);
      
      // If product is NOT in offer, return it normally
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

      // Product IS in offer - check BOTH conditions
      const offerProduct = offerProducts.find(op => op.product_id === product.id);
      const maxUses = offerProduct.limited_use;
      const timesUsed = offerProduct.times_used || 0;
      const userUsageCount = usedProductMap.get(product.id) || 0;
      
      console.log(`📍 Favorite Product ${product.id}: maxUses=${maxUses}, timesUsed=${timesUsed}, userUsageCount=${userUsageCount}`);
      
      // Check BOTH conditions:
      const globalLimitNotReached = maxUses === null || timesUsed < maxUses;
      const userHasNotUsedProduct = userUsageCount < 1;
      
      const canUseOffer = globalLimitNotReached && userHasNotUsedProduct;
      
      let finalPrice = originalPrice;
      let offerInfo = null;

      // Calculate discounted price
      let calculatedDiscountedPrice = originalPrice;
      if (appliedOffer.discount_type === 'percentage') {
        calculatedDiscountedPrice = originalPrice * (1 - discountValue / 100);
      } else if (appliedOffer.discount_type === 'fixed') {
        calculatedDiscountedPrice = Math.max(0.01, originalPrice - discountValue);
      }
      calculatedDiscountedPrice = parseFloat(calculatedDiscountedPrice.toFixed(2));

      if (canUseOffer) {
        // User CAN use the offer - apply the discount
        finalPrice = calculatedDiscountedPrice;
        
        offerInfo = {
          offer_id: appliedOffer.id,
          offer_name: appliedOffer.name,
          discount_type: appliedOffer.discount_type,
          discount_value: discountValue,
          original_price: originalPrice,
          discounted_price: calculatedDiscountedPrice,
          can_use_offer: true,
          times_used: timesUsed,
          max_uses: maxUses,
          remaining_uses: maxUses ? maxUses - timesUsed : null,
          user_has_used: userUsageCount >= 1,
          user_usage_count: userUsageCount,
          valid_until: appliedOffer.end_at,
          description: appliedOffer.description
        };

        console.log(`   ✅ Discount applied: ${originalPrice} -> ${finalPrice}, discount: ${discountValue}${appliedOffer.discount_type === 'percentage' ? '%' : 'MAD'}`);
      } else {
        // User CANNOT use the offer - but still include offer info for frontend display
        finalPrice = originalPrice;
        
        let reason = '';
        if (!globalLimitNotReached) {
          reason = 'Global limit reached';
        } else if (!userHasNotUsedProduct) {
          reason = 'User already used this product';
        }

        offerInfo = {
          offer_id: appliedOffer.id,
          offer_name: appliedOffer.name,
          discount_type: appliedOffer.discount_type,
          discount_value: discountValue,
          original_price: originalPrice,
          discounted_price: calculatedDiscountedPrice,
          can_use_offer: false,
          times_used: timesUsed,
          max_uses: maxUses,
          remaining_uses: maxUses ? maxUses - timesUsed : null,
          user_has_used: userUsageCount >= 1,
          user_usage_count: userUsageCount,
          valid_until: appliedOffer.end_at,
          description: appliedOffer.description,
          reason: reason
        };

        console.log(`   ❌ ${reason} (Global: ${timesUsed}/${maxUses}, User: ${userUsageCount}/1) - Showing original price: ${originalPrice}, would be: ${calculatedDiscountedPrice}`);
      }

      return {
        ...product,
        price: originalPrice,
        original_price: originalPrice,
        final_price: finalPrice,
        rating: parseFloat(product.rating) || 0,
        promo: Boolean(product.promo),
        is_popular: Boolean(product.is_popular),
        active: Boolean(product.active),
        has_offer: isInOffer,
        discount_applied: canUseOffer,
        offer_info: offerInfo
      };
    });

    // Count favorites with active discounts
    const favoritesWithActiveDiscounts = processedFavorites.filter(p => p.discount_applied).length;
    const favoritesInOfferButNoDiscount = processedFavorites.filter(p => p.has_offer && !p.discount_applied).length;

    const [results] = await connection.execute(
      `SELECT restaurant_name from restaurant_settings`,
    );

    const restaurant_name = results[0]?.restaurant_name || 'Restaurant';

    return res.json({
      success: true,
      favorites: processedFavorites,
      restaurant_name: restaurant_name,
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
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Error releasing connection:', releaseError);
      }
    }
  }
};
