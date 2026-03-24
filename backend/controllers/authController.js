import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import db from "../config/db.js"; // adjust to your DB connection file
import pool from "../config/db.js";
import { sendVerificationSMS } from '../utils/smsService.js'; // Add .js extension

export const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // 🧩 1. Cleanup: Treat empty strings/whitespace as real NULL
    const cleanEmail = (email && email.trim() !== "") ? email.trim() : null;

    // 🧩 2. Validation
    if (!name || !password || !password.trim() || !phone) {
      return res.status(400).json({ message: "Name, password, and phone are required" });
    }

    // 🧩 3. Check for existing account
    if (cleanEmail) {
      const [existingEmail] = await db.execute("SELECT * FROM clients WHERE email = ?", [cleanEmail]);
      if (existingEmail.length > 0) {
        return res.status(409).json({ message: "Email already registered" });
      }
    }

    const [existingPhone] = await db.execute("SELECT * FROM clients WHERE phone = ?", [phone]);
    if (existingPhone.length > 0) {
      return res.status(409).json({ message: "Phone number already registered" });
    }

    // 🧩 4. Hash password and Insert
    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    
    const [result] = await db.execute(
      "INSERT INTO clients (name, email, password, phone, is_verified) VALUES (?, ?, ?, ?, ?)",
      [name, cleanEmail, hashedPassword, phone, 1]
    );

    const newClientId = result.insertId;

    // 🧩 5. Auto-Login: Generate JWT (Matches your login logic)
    const token = jwt.sign(
      { id: newClientId, email: cleanEmail, name: name },
      process.env.JWT_SECRET,
      { expiresIn: "109500d" } // Permanent login
    );

    // 🧩 6. Final Response (Matches login response structure)
    res.status(201).json({
      message: "Registration successful",
      client: {
        id: newClientId,
        name: name,
        email: cleanEmail,
        phone: phone,
        gender: null,
        bio: null,
        image: null,
        isPhoneVerified: 0,
        lat: null, 
        lon: null,
        adresses: null,
      },
      token,
    });

  } catch (error) {
    console.error("❌ Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const verifyEmail = async (req, res) => {
  let connection;
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    // Get a connection from the pool
    connection = await pool.getConnection();

    // Check if user exists
    const [user] = await connection.execute(
      "SELECT * FROM clients WHERE email = ?",
      [email]
    );

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const client = user[0];

    // Compare codes
    if (client.verification_code !== String(code)) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Mark email as verified
    await connection.execute(
      "UPDATE clients SET is_verified = ?, verification_code = NULL WHERE email = ?",
      [1, email]
    );

    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ message: "Server error verifying email" });
  } finally {
    if (connection) connection.release(); // always release the connection
  }
};

export const login = async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body;

    // 🧩 1. Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // 🧩 2. Get a connection
    connection = await pool.getConnection();

    // 🧩 3. FIRST: Check if it's an admin login from the admins table
    const [adminRows] = await connection.execute(
      "SELECT * FROM admins WHERE email = ? AND is_active = 1",
      [email]
    );

    if (adminRows.length > 0) {
    const admin = adminRows[0];
    
    // Compare passwords (assuming passwords are hashed with bcrypt)
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT token for admin
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role || 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: "109500d" }
    );

    // ✅ CRITICAL: Update BOTH last_login AND api_token in the database
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7); // Expires in 7 days

    await connection.execute(
      `UPDATE admins 
      SET last_login = NOW(),
          api_token = ?,
          token_expires_at = ?
      WHERE id = ?`,
      [token, tokenExpiresAt, admin.id]
    );

    console.log('✅ Updated admin token in database:', {
      adminId: admin.id,
      email: admin.email,
      tokenPreview: token.substring(0, 30) + '...',
      expiresAt: tokenExpiresAt.toISOString()
    });

    return res.status(200).json({
      message: "Admin login successful",
      admin: {
        email: admin.email,  // Only return email, nothing else
        id: admin.id,
      },
      token,
    });
    }
    
    // 🧩 3. Check if client exists
    const [rows] = await connection.execute(
      "SELECT * FROM clients WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    const client = rows[0];

    // 🧩 4. Check if email is verified
    if (!client.is_verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }
    // 🧩 5. Compare passwords securely
    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 🧩 6. Generate JWT token
    const token = jwt.sign(
      {
        id: client.id,
        email: client.email,
        name: client.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "109500d" } // you can adjust expiration
    );

    // 🧩 7. Send response
    return res.status(200).json({
      message: "Login successful",
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        birthDate: client.birthDate,
        gender: client.gender,
        bio: client.bio,
        adresses: client.adresses,
        image: client.image,
        isPhoneVerified: client.isPhoneVerified,
        lat: client.lat,
        lon: client.lon,
      },
      token,
    });
  } catch (error) {
    console.error("❌ Login error:", error.message);
    return res.status(500).json({ message: "Server error during login" });
  } finally {
    if (connection) connection.release();
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    // Check if client exists
    const [rows] = await pool.query("SELECT * FROM clients WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No user found with this email." });
    }

    const client = rows[0];

    // Check if a reset code is already active and not expired
    if (client.resetPasswordExpire && new Date(client.resetPasswordExpire) > new Date()) {
      return res.status(200).json({
        message: "A reset code has already been sent. Please check your email.",
        success: true,
        resetOnProcess: true, // ✅ flag to indicate an active reset
        email: client.email,   // you can pass the email to redirect
      });
    }

    // Generate a 6-digit numeric code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString(); // e.g., "654321"
    const resetCodeExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Save code and expiry in DB
    await pool.query(
      "UPDATE clients SET resetPasswordCode = ?, resetPasswordExpire = ? WHERE id = ?",
      [resetCode, resetCodeExpire, client.id]
    );

    // Send email using Nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Your App Name" <${process.env.EMAIL_USER}>`,
      to: client.email,
      subject: "Password Reset Code",
      text: `Your password reset code is: ${resetCode}. It is valid for 15 minutes.`,
      html: `<p>Your password reset code is:</p>
             <h2>${resetCode}</h2>
             <p>This code is valid for 15 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: "Password reset code sent to your email.",
      success: true,
      resetOnProcess: false, // ✅ new request sent
      email: client.email,
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password) {
      return res.status(400).json({ message: "Email, code, and new password are required." });
    }
    
    // Check if client exists
    const [rows] = await pool.query("SELECT * FROM clients WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No user found with this email." });
    }
    const client = rows[0];
    
    // Check if code matches and not expired
    if (
      !client.resetPasswordCode ||
      client.resetPasswordCode !== code ||
      !client.resetPasswordExpire ||
      new Date(client.resetPasswordExpire) < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired reset code." });
    }


    // Hash the new password
    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    
    // Update password and clear reset fields
    await pool.query(
      "UPDATE clients SET password = ?, resetPasswordCode = NULL, resetPasswordExpire = NULL WHERE id = ?",
      [hashedPassword, client.id]
    );
    
    // ✅ Generate JWT token (login automatically)
    const token = jwt.sign(
      {
        id: client.id,
        email: client.email,
        name: client.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "109500d" }
    );
    
    return res.status(200).json({
      message: "Password has been reset successfully and you are logged in.",
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        birthDate: client.birthDate,
        gender: client.gender,
        bio: client.bio,
        adresses: client.adresses,
        image: client.image,
        isPhoneVerified: client.isPhoneVerified,
        lat: client.lat,
        lon: client.lon,
      },
      token,
      success: true,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const getCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, image, description, created_at FROM categories ORDER BY created_at DESC"
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching categories:", error.message);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

export const getProducts = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const [rows] = await connection.query(`
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.price, 
        p.rating, 
        p.image, 
        p.delivery,
        p.promo, 
        p.promoValue,
        p.badge,
        p.is_popular,
        p.created_at,
        c.name AS category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `);


    // ✅ SANITIZE + NORMALIZE OUTPUT
    const safeProducts = rows.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: Number(p.price) || 0,
      rating: Number(p.rating) || 0,
      image: p.image || "",
      delivery: p.delivery || "",
      promo: p.promo === 1 || p.promo === true,  // force boolean
      promoValue: Number(p.promoValue) || 0,
      badge: p.badge || "",
      is_popular: p.is_popular === 1 || p.is_popular === true,  // force boolean
      created_at: p.created_at,
      category_name: p.category_name || "",
    }));
    
    const [results] = await db.execute(
      `SELECT restaurant_name from restaurant_settings`,
    );

    const restaurant_name = results[0]?.restaurant_name || 'Restaurant';

    res.json({safeProducts: safeProducts, restaurant_name: restaurant_name});

  } catch (error) {
    console.error("❌ Error fetching products:", error.message);
    res.status(500).json({ message: "Server error while fetching products" });
  }finally{
    if (connection) connection.release();
  }
};


export const deliveryManLogin = async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body;
    // 🧩 1. Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    // 🧩 2. Get a connection
    connection = await pool.getConnection();
    // 🧩 3. Check if delivery man exists
    const [rows] = await connection.execute(
      "SELECT * FROM delivery_men WHERE email = ?",
      [email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "No account found with this email" });
    }
    const deliveryMan = rows[0];
    // 🧩 4. Check if account is active
    if (!deliveryMan.is_active) {
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact support.",
      });
    }
    // 🧩 5. Compare passwords securely
    const isMatch = await bcrypt.compare(password, deliveryMan.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    // 🧩 5.5. Update last_login
    await connection.execute(
      "UPDATE delivery_men SET last_login = NOW() WHERE id = ?",
      [deliveryMan.id]
    );
    
    // 🧩 6. Generate JWT token
    const token = jwt.sign(
      {
        id: deliveryMan.id,
        email: deliveryMan.email,
        name: deliveryMan.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "109500d" } // you can adjust expiration
    );
    // 🧩 7. Send response
    return res.status(200).json({
      message: "Login successful",
      deliveryMan: {
        id: deliveryMan.id,
        name: deliveryMan.name,
        email: deliveryMan.email,
        phone: deliveryMan.phone,
        vehicle_type: deliveryMan.vehicle_type,
        license_number: deliveryMan.license_number,
        is_active: deliveryMan.is_active,
        current_latitude: deliveryMan.current_latitude,
        current_longitude: deliveryMan.current_longitude,
      },
      token,
    });
  } catch (error) {
    console.error("❌ Login error:", error.message);
    return res.status(500).json({ message: "Server error during login" });
  } finally {
    if (connection) connection.release();
  }
};


export const loginWithPhone = async (req, res) => {
  let connection;
  try {
    const { phone, password } = req.body;
    // 🧩 1. Validate input
    if (!phone || !password) {
      return res.status(400).json({ message: "Phone number and password are required" });
    }
    // 🧩 2. Get a connection
    connection = await pool.getConnection();
    // 🧩 3. Check if client exists
    const [rows] = await connection.execute(
      "SELECT * FROM clients WHERE phone = ?",
      [phone]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "No account found with this phone number" });
    }
    const client = rows[0];
    // 🧩 4. Check if email is verified
    if (!client.is_verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }
    // 🧩 5. Compare passwords securely
    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid phone number or password" });
    }
    // 🧩 6. Generate JWT token
    const token = jwt.sign(
      {
        id: client.id,
        email: client.email,
        name: client.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "109500d" }
    );
    // 🧩 7. Send response
    return res.status(200).json({
      message: "Login successful",
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        birthDate: client.birthDate,
        gender: client.gender,
        bio: client.bio,
        adresses: client.adresses,
        image: client.image,
        isPhoneVerified: client.isPhoneVerified,
        lat: client.lat,
        lon: client.lon,
      },
      token,
    });
  } catch (error) {
    console.error("❌ Login error:", error.message);
    return res.status(500).json({ message: "Server error during login" });
  } finally {
    if (connection) connection.release();
  }
};

// products with offers

export const getAllProductsWithOffers = async (req, res) => {
  let connection;
  try {
    const { page = 1, limit = 20, category_id, search, userId } = req.query;
    connection = await pool.getConnection();

    // ----- Base products query (same as before) -----
    let baseQuery = `
      SELECT DISTINCT
        p.*, 
        c.name as category_name,
        c.image as category_image
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.active = TRUE AND c.active = TRUE
    `;
    const baseParams = [];
    if (category_id) {
      baseQuery += " AND p.category_id = ?";
      baseParams.push(category_id);
    }
    if (search) {
      baseQuery += " AND (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)";
      const searchTerm = `%${search}%`;
      baseParams.push(searchTerm, searchTerm, searchTerm);
    }
    baseQuery += " ORDER BY p.is_popular DESC, p.created_at DESC";
    const offset = (parseInt(page) - 1) * parseInt(limit);
    baseQuery += ` LIMIT ? OFFSET ?`;
    baseParams.push(parseInt(limit), offset);

    const [baseProducts] = await connection.execute(baseQuery, baseParams);

    // If no userId, return products without offer data
    if (!userId) {
      const simpleProducts = baseProducts.map(p => ({
        ...p,
        price: parseFloat(p.price),
        rating: parseFloat(p.rating) || 0,
        promo: Boolean(p.promo),
        is_popular: Boolean(p.is_popular),
        active: Boolean(p.active),
        has_offer: false,
        discount_applied: false,
        offer_info: null
      }));

      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM products p 
         JOIN categories c ON p.category_id = c.id 
         WHERE p.active = TRUE AND c.active = TRUE`
      );

      return res.status(200).json({
        success: true,
        products: simpleProducts,
        pagination: {
          total: countResult[0].total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(countResult[0].total / parseInt(limit)),
        },
        user_context: { user_id: null, has_active_offer: false }
      });
    }

    // ----- Check for an active offer applied by the user -----
    const [userOffers] = await connection.execute(
      `SELECT * FROM offers 
       WHERE is_active = TRUE 
         AND start_at <= NOW() 
         AND end_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (userOffers.length === 0) {
      // No active offer → return products normally
      const simpleProducts = baseProducts.map(p => ({ ...p, /* ... */ }));
      // ... (same as above)
      return res.status(200).json({ /* ... */ });
    }

    const appliedOffer = userOffers[0];

    // ----- Get the user's usage count for this offer -----
    const [userUsageRows] = await connection.execute(
      `SELECT usage_count FROM offer_usages 
       WHERE offer_id = ? AND user_id = ?`,
      [appliedOffer.id, userId]
    );
    const userUsageCount = userUsageRows.length > 0 ? userUsageRows[0].usage_count : 0;
    const userHasApplied = userUsageCount > 0;   // true if the user has ever applied this offer

    // ----- Get all products included in this offer -----
    const [offerProducts] = await connection.execute(
      `SELECT op.product_id, op.limited_use, op.times_used
       FROM offer_products op
       JOIN products p ON op.product_id = p.id
       WHERE op.offer_id = ? AND p.active = TRUE`,
      [appliedOffer.id]
    );
    const offerProductIds = offerProducts.map(p => p.product_id);

    // ----- Parse discount value -----
    let discountValue = parseFloat(appliedOffer.discount);
    if (isNaN(discountValue)) {
      // Invalid discount → fallback to no offer
      const simpleProducts = baseProducts.map(p => ({ /* ... */ }));
      return res.status(200).json({ /* ... */ });
    }

    // ----- Process each product -----
    const processedProducts = baseProducts.map(product => {
      const originalPrice = parseFloat(product.price);
      const isInOffer = offerProductIds.includes(product.id);

      // Default: no offer applied
      let finalPrice = originalPrice;
      let discountApplied = false;
      let offerInfo = null;

      if (isInOffer) {
        const offerProduct = offerProducts.find(op => op.product_id === product.id);
        const maxUses = offerProduct.limited_use;
        const timesUsed = offerProduct.times_used || 0;
        const globalLimitNotReached = maxUses === null || timesUsed < maxUses;

        // Calculate discounted price (for display, even if not applied)
        let calculatedPrice = originalPrice;
        if (appliedOffer.discount_type === 'percentage') {
          calculatedPrice = originalPrice * (1 - discountValue / 100);
        } else {
          calculatedPrice = Math.max(0.01, originalPrice - discountValue);
        }
        calculatedPrice = parseFloat(calculatedPrice.toFixed(2));

        // Discount applies only if user has applied AND global limit not reached
        discountApplied = userHasApplied && globalLimitNotReached;
        if (discountApplied) {
          finalPrice = calculatedPrice;
        }

        offerInfo = {
          offer_id: appliedOffer.id,
          offer_name: appliedOffer.name,
          discount_type: appliedOffer.discount_type,
          discount_value: discountValue,
          original_price: originalPrice,
          discounted_price: calculatedPrice,
          can_use_offer: discountApplied,
          times_used: timesUsed,
          max_uses: maxUses,
          remaining_uses: maxUses ? maxUses - timesUsed : null,
          user_has_used: userHasApplied,
          user_usage_count: userUsageCount,
          valid_until: appliedOffer.end_at,
          description: appliedOffer.description
        };
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
        discount_applied: discountApplied,
        offer_info: offerInfo
      };
    });

    // ----- Pagination and response -----
    let countQuery = `SELECT COUNT(*) as total FROM products p 
                      JOIN categories c ON p.category_id = c.id 
                      WHERE p.active = TRUE AND c.active = TRUE`;
    const countParams = [];
    if (category_id) {
      countQuery += " AND p.category_id = ?";
      countParams.push(category_id);
    }
    if (search) {
      countQuery += " AND (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)";
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    const [countResult] = await connection.execute(countQuery, countParams);

    const [settings] = await db.execute(`SELECT restaurant_name FROM restaurant_settings`);
    const restaurant_name = settings[0]?.restaurant_name || 'Restaurant';

    const productsWithActiveDiscounts = processedProducts.filter(p => p.discount_applied).length;

    return res.status(200).json({
      success: true,
      products: processedProducts,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / parseInt(limit)),
      },
      user_context: {
        user_id: userId,
        has_active_offer: productsWithActiveDiscounts > 0,
        offer_details: {
          id: appliedOffer.id,
          name: appliedOffer.name,
          discount_type: appliedOffer.discount_type,
          discount_value: discountValue,
          valid_until: appliedOffer.end_at,
          total_products_in_offer: offerProductIds.length,
          available_products: productsWithActiveDiscounts,
          unavailable_products: processedProducts.filter(p => p.has_offer && !p.discount_applied).length
        }
      },
      restaurant_name
    });

  } catch (error) {
    console.error("❌ Error in getAllProductsWithOffers:", error.message);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// end products with offers

// verify client phone

const sendVerificationCode = async (req, res) => {
  const { phone } = req.body;

  console.log('📱 Controller - Phone from body:', phone);

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required'
    });
  }

  try {
    const [clients] = await db.query(
      'SELECT * FROM clients WHERE phone = ?',
      [phone]
    );

    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const client = clients[0];
    
    console.log('🔍 Client verification status:');
    console.log('   - is_verified (email):', client.is_verified);
    console.log('   - isPhoneVerified (phone):', client.isPhoneVerified);

    if (client.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is already verified'
      });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔢 Controller - Generated code:', verificationCode);

    await db.query(
      `UPDATE clients 
       SET phoneVerificationCode = ?, 
           phoneVerificationCodeExpire = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
       WHERE phone = ?`,
      [verificationCode, phone]
    );

    console.log('🚀 About to call SMS function with:');
    console.log('   - Phone:', phone);
    console.log('   - Code:', verificationCode);

    const smsSent = await sendVerificationSMS(phone, verificationCode);


    if (smsSent) {
      // FIX: Return success: true explicitly
      return res.json({
        success: true,  // ← THIS WAS MISSING
        message: 'Verification code sent successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send SMS to this carrier'
      });
    }

  } catch (error) {
    console.error('Send verification code error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send verification code'
    });
  }
};

export { sendVerificationCode };

// update the phone status for clients
export const verifyPhoneCode = async (req, res) => {
  const { clientId, code } = req.body;

  console.log("📩 Phone Verification Request:", { clientId, code });

  if (!clientId || !code) {
    return res.status(400).json({
      success: false,
      message: "Client ID and verification code are required",
    });
  }

  try {
    // Use MySQL to validate expiration, no JS date parsing
    const [clients] = await db.query(
      `SELECT 
          id, 
          phoneVerificationCode,
          phoneVerificationCodeExpire,
          isPhoneVerified,
          (phoneVerificationCodeExpire > NOW()) AS isValid
       FROM clients
       WHERE id = ?`,
      [clientId]
    );

    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const client = clients[0];

    // Already verified
    if (client.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: "Phone number already verified",
      });
    }

    // Code does not match
    if (client.phoneVerificationCode !== code) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    // Code expired — MySQL checks it, not JS
    if (client.isValid === 0) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired",
      });
    }

    // Mark phone as verified
    await db.query(
      `UPDATE clients 
       SET isPhoneVerified = 1,
           phoneVerificationCode = NULL,
           phoneVerificationCodeExpire = NULL
       WHERE id = ?`,
      [clientId]
    );

    console.log("📱 Phone Verified Successfully for ID:", clientId);

    return res.json({
      success: true,
      message: "Phone number verified successfully",
    });

  } catch (error) {
    console.error("❌ Error verifying phone:", error);
    return res.status(500).json({
      success: false,
      message: "Server error verifying phone number",
    });
  }
};

// Get public restaurant settings
export const getRestaurantSettingsPublic = async (req, res) => {
  try {
    const [settings] = await pool.execute(`
      SELECT 
        id,
        restaurant_name,
        restaurant_address,
        restaurant_latitude,
        restaurant_longitude,
        phone,
        restaurant_email,
        base_delivery_fee,
        per_km_fee,
        max_delivery_distance_km,
        min_delivery_fee,
        max_delivery_fee,
        is_open,
        restaurant_logo,
        restaurant_home_screen_icon,
        updated_at
      FROM restaurant_settings
      LIMIT 1
    `);

    if (settings.length === 0) {
      return res.json({
        success: true,
        settings: {
          is_open: true,
          restaurant_logo: '',
          restaurant_home_screen_icon: ''
        }
      });
    }

    return res.json({
      success: true,
      settings: {
        ...settings[0],
        restaurant_latitude: parseFloat(settings[0].restaurant_latitude),
        restaurant_longitude: parseFloat(settings[0].restaurant_longitude),
        base_delivery_fee: parseFloat(settings[0].base_delivery_fee),
        per_km_fee: parseFloat(settings[0].per_km_fee),
        max_delivery_distance_km: parseFloat(settings[0].max_delivery_distance_km),
        min_delivery_fee: parseFloat(settings[0].min_delivery_fee),
        max_delivery_fee: parseFloat(settings[0].max_delivery_fee),
        is_open: Boolean(settings[0].is_open),
      }
    });
  } catch (error) {
    console.error("Error fetching public restaurant settings:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// homepage all data
export const getHomePageData = async (req, res) => {
  try {
    const { category_id, search, userId } = req.query;

    const productBaseParams = [];
    let productWhereClause = "WHERE p.active = TRUE AND c.active = TRUE";

    if (category_id) {
      productWhereClause += " AND p.category_id = ?";
      productBaseParams.push(category_id);
    }

    if (search) {
      productWhereClause += " AND (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)";
      const searchTerm = `%${search}%`;
      productBaseParams.push(searchTerm, searchTerm, searchTerm);
    }

    const productDataQuery = `
      SELECT DISTINCT
        p.*, 
        c.name as category_name,
        c.image as category_image
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ${productWhereClause}
      ORDER BY p.is_popular DESC, p.created_at DESC
    `;

    const categoriesQuery = `
      SELECT id, name, image, description, created_at 
      FROM categories 
      WHERE active = TRUE
      ORDER BY created_at DESC
    `;

    const offersQuery = `
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
        EXISTS(
          SELECT 1
          FROM offer_usages ou
          WHERE ou.offer_id = o.id AND ou.user_id = ?
        ) as is_applied_by_user
      FROM offers o
      LEFT JOIN offer_products op ON o.id = op.offer_id
      LEFT JOIN products p ON op.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.is_active = TRUE
        AND o.start_at <= NOW()
        AND o.end_at > NOW()
      ORDER BY o.created_at DESC
    `;

    const settingsQuery = `SELECT restaurant_name FROM restaurant_settings LIMIT 1`;

    const [
      [baseProducts],
      [categories],
      [offersResults],
      [settingsResults]
    ] = await Promise.all([
      pool.execute(productDataQuery, productBaseParams),
      pool.execute(categoriesQuery),
      pool.execute(offersQuery, [userId || null]),
      pool.execute(settingsQuery)
    ]);

    const restaurantName = settingsResults[0]?.restaurant_name || 'Restaurant';

    const processedOffersMap = new Map();
    offersResults.forEach(row => {
      const offerId = row.id;

      if (!processedOffersMap.has(offerId)) {
        processedOffersMap.set(offerId, {
          id: row.id,
          name: row.name,
          discount_type: row.discount_type,
          discount: parseFloat(row.discount),
          image: row.image,
          description: row.description,
          start_at: row.start_at,
          end_at: row.end_at,
          is_active: Boolean(row.is_active),
          is_applied_by_user: Boolean(row.is_applied_by_user),
          products: []
        });
      }

      if (row.product_id) {
        const offer = processedOffersMap.get(offerId);
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

    const processedOffers = Array.from(processedOffersMap.values());

    const globalOfferMap = new Map();
    offersResults.forEach(row => {
      if (row.product_id && !globalOfferMap.has(row.product_id)) {
        globalOfferMap.set(row.product_id, row);
      }
    });

    let productsWithActiveDiscounts = 0;

    const processedProducts = baseProducts.map(p => {
      const product = {
        ...p,
        price: parseFloat(p.price),
        rating: parseFloat(p.rating) || 0,
        promo: Boolean(p.promo),
        is_popular: Boolean(p.is_popular),
        active: Boolean(p.active),
        has_offer: false,
        discount_applied: false,
        offer_info: null
      };

      const offerData = globalOfferMap.get(product.id);
      if (!offerData) return product;

      const userHasApplied = Boolean(offerData.is_applied_by_user);
      const originalPrice = product.price;
      const discountValue = parseFloat(offerData.discount);
      const maxUses = offerData.limited_use;
      const timesUsed = offerData.times_used || 0;

      let calculatedPrice = originalPrice;
      if (offerData.discount_type === 'percentage') {
        calculatedPrice = originalPrice * (1 - discountValue / 100);
      } else {
        calculatedPrice = Math.max(0.01, originalPrice - discountValue);
      }

      calculatedPrice = parseFloat(calculatedPrice.toFixed(2));

      const globalLimitNotReached = maxUses === null || timesUsed < maxUses;
      const canUseOffer = userHasApplied && globalLimitNotReached;

      if (canUseOffer) {
        productsWithActiveDiscounts++;
      }

      return {
        ...product,
        original_price: originalPrice,
        final_price: canUseOffer ? calculatedPrice : originalPrice,
        has_offer: true,
        discount_applied: canUseOffer,
        offer_info: {
          offer_id: offerData.id,
          offer_name: offerData.name,
          discount_type: offerData.discount_type,
          discount_value: discountValue,
          original_price: originalPrice,
          discounted_price: calculatedPrice,
          can_use_offer: canUseOffer,
          user_has_applied: userHasApplied,
          remaining_uses: maxUses ? maxUses - timesUsed : null,
          valid_until: offerData.end_at,
          reason: !userHasApplied ? 'Offer not applied' : (globalLimitNotReached ? null : 'Restaurant limit reached')
        }
      };
    });

    const userContext = {
      user_id: userId,
      has_active_offer: productsWithActiveDiscounts > 0,
      available_discounts_count: productsWithActiveDiscounts
    };

    return res.status(200).json({
      success: true,
      restaurant_name: restaurantName,
      offers: processedOffers,
      categories,
      products: processedProducts,
      user_context: userContext
    });

  } catch (error) {
    console.error("❌ Error fetching home page data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load home page data",
      error: error.message
    });
  }
};


// login with google
export const loginWithGoogle = async (req, res) => {
  let connection;
  try {
    const { idToken, email, name, photo } = req.body;

    // 🧩 1. Validate input
    if (!idToken || !email) {
      return res.status(400).json({ 
        message: "ID token and email are required" 
      });
    }

    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client();
    
    let ticket;
    try {
      ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: [
          '158740940579-ificug8hbe28n6kjjchj3ml53f29u9ka.apps.googleusercontent.com',
          '158740940579-q6mt4k4rqqbl8qjgn35e8rfigirbc36e.apps.googleusercontent.com', 
          '158740940579-q1ljk05bp6iddbg435jofeddo2tlsl7p.apps.googleusercontent.com' 
      ]
      });
    } catch (googleError) {
      console.error('❌ Google token verification failed:', googleError);
      return res.status(401).json({ 
        message: "Invalid Google token" 
      });
    }

    const payload = ticket.getPayload();
    
    // Verify email matches
    if (payload.email !== email) {
      return res.status(401).json({ 
        message: "Email does not match Google account" 
      });
    }

    // 🧩 3. Get database connection
    connection = await pool.getConnection();

    // 🧩 4. Check if client exists
    const [rows] = await connection.execute(
      "SELECT * FROM clients WHERE email = ?",
      [email]
    );

    let clientData;
    
    if (rows.length === 0) {
      // 🧩 5. Create new user if doesn't exist
      const generatedPassword = await bcrypt.hash(
        `google_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, 
        10
      );
      
      const [result] = await connection.execute(
        `INSERT INTO clients 
         (email, password, name,phone, image, is_verified, google_id, created_at) 
         VALUES (?, ?, ?,?, ?, ?, ?, NOW())`,
        [
          email,
          generatedPassword,
          name || payload.name || email.split('@')[0],
          null,
          photo || payload.picture,
          1, // Auto-verify Google users (using your existing is_verified)
          payload.sub, // Google user ID
        ]
      );

      clientData = {
        id: result.insertId,
        email: email,
        name: name || payload.name || email.split('@')[0],
        phone: null,
        birthDate: null,
        gender: null,
        bio: null,
        adresses: null,
        image: photo || payload.picture,
        isPhoneVerified: 0,
        is_verified: 1,
      };
    } else {
      // 🧩 6. User exists - update Google ID if needed
      clientData = rows[0];
      
      // Update Google ID if not set
      if (!clientData.google_id) {
        await connection.execute(
          "UPDATE clients SET google_id = ? WHERE id = ?",
          [payload.sub, clientData.id]
        );
      }
      
      // Update is_verified to 1 for Google users
      if (clientData.is_verified !== 1) {
        await connection.execute(
          "UPDATE clients SET is_verified = 1 WHERE id = ?",
          [clientData.id]
        );
        clientData.is_verified = 1;
      }
      
      // Update profile image if empty
      if (!clientData.image && (photo || payload.picture)) {
        await connection.execute(
          "UPDATE clients SET image = ? WHERE id = ?",
          [photo || payload.picture, clientData.id]
        );
        clientData.image = photo || payload.picture;
      }
    }

    // 🧩 7. Generate JWT token
    const token = jwt.sign(
      {
        id: clientData.id,
        email: clientData.email,
        name: clientData.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "109500d" }
    );

    // 🧩 8. Send response
    return res.status(200).json({
      message: "Google login successful",
      client: {
        id: clientData.id,
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        birthDate: clientData.birthDate,
        gender: clientData.gender,
        bio: clientData.bio,
        adresses: clientData.adresses,
        image: clientData.image,
        isPhoneVerified: clientData.isPhoneVerified,
      },
      token,
      success: true
    });

  } catch (error) {
    console.error("❌ Google login error:", error.message);
    return res.status(500).json({ 
      message: "Server error during Google login",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) connection.release();
  }
};

// Public endpoint for restaurant open status and operating hours
export const getRestaurantOpenStatus = async (req, res) => {
  try {
    const serverTime = new Date();
    const moroccoTimeStr = serverTime.toLocaleString("en-US", { timeZone: "Africa/Casablanca" });
    const moroccoTime = new Date(moroccoTimeStr);

    const currentDay = moroccoTime.getDay();
    const yesterday = (currentDay + 6) % 7;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const [allHours] = await pool.execute(`
      SELECT 
        day_of_week,
        is_closed,
        TIME_FORMAT(open_time, '%H:%i') as open_time,
        TIME_FORMAT(close_time, '%H:%i') as close_time
      FROM restaurant_operating_hours
      ORDER BY day_of_week
    `);

    const [settings] = await pool.execute(`
      SELECT is_open, restaurant_name
      FROM restaurant_settings
      LIMIT 1
    `);

    const manualIsOpen = settings.length > 0 ? Boolean(settings[0].is_open) : true;
    const restaurantName = settings.length > 0 ? settings[0].restaurant_name : 'Restaurant';

    let isCurrentlyOpen = false;
    let activeSchedule = null;

    const isShiftActive = (daySchedule, referenceDate, dayOffset = 0) => {
      if (!daySchedule || daySchedule.is_closed) return false;

      const openTime = new Date(referenceDate);
      openTime.setDate(openTime.getDate() + dayOffset);
      const [oH, oM] = daySchedule.open_time.split(':');
      openTime.setHours(Number(oH), Number(oM), 0, 0);

      const closeTime = new Date(referenceDate);
      closeTime.setDate(closeTime.getDate() + dayOffset);
      const [cH, cM] = daySchedule.close_time.split(':');
      closeTime.setHours(Number(cH), Number(cM), 0, 0);

      if (closeTime <= openTime) {
        closeTime.setDate(closeTime.getDate() + 1);
      }

      return referenceDate >= openTime && referenceDate < closeTime;
    };

    const todayHours = allHours.find(h => h.day_of_week === currentDay);
    const yesterdayHours = allHours.find(h => h.day_of_week === yesterday);

    if (isShiftActive(todayHours, moroccoTime, 0)) {
      isCurrentlyOpen = true;
      activeSchedule = todayHours;
    } else if (isShiftActive(yesterdayHours, moroccoTime, -1)) {
      isCurrentlyOpen = true;
      activeSchedule = yesterdayHours;
    }

    const finalIsOpen = isCurrentlyOpen && manualIsOpen;

    let nextOpenTime = null;

    if (!finalIsOpen) {
      if (manualIsOpen && todayHours && !todayHours.is_closed) {
        const openToday = new Date(moroccoTime);
        const [h, m] = todayHours.open_time.split(':');
        openToday.setHours(Number(h), Number(m), 0, 0);

        if (moroccoTime < openToday) {
          nextOpenTime = {
            day_name: dayNames[currentDay],
            time: todayHours.open_time,
            is_today: true
          };
        }
      }

      if (!nextOpenTime) {
        for (let i = 1; i <= 7; i++) {
          const checkDay = (currentDay + i) % 7;
          const nextDayHours = allHours.find(h => h.day_of_week === checkDay);

          if (nextDayHours && !nextDayHours.is_closed) {
            nextOpenTime = {
              day_name: dayNames[checkDay],
              time: nextDayHours.open_time,
              is_today: false
            };
            break;
          }
        }
      }
    }

    const operatingHours = allHours.map(h => ({
      day_of_week: h.day_of_week,
      day_name: dayNames[h.day_of_week],
      is_closed: Boolean(h.is_closed),
      open_time: h.open_time,
      close_time: h.close_time
    }));

    return res.json({
      success: true,
      restaurant_name: restaurantName,
      is_open: finalIsOpen,
      manual_toggle: manualIsOpen,
      current_time: moroccoTime.toTimeString().slice(0, 5),
      current_day: dayNames[currentDay],
      current_day_index: currentDay,
      today_schedule: activeSchedule
        ? {
            day_name: dayNames[activeSchedule.day_of_week],
            is_closed: false,
            open_time: activeSchedule.open_time,
            close_time: activeSchedule.close_time
          }
        : todayHours
        ? {
            day_name: dayNames[currentDay],
            is_closed: Boolean(todayHours.is_closed),
            open_time: todayHours.open_time,
            close_time: todayHours.close_time
          }
        : null,
      next_open: nextOpenTime,
      operating_hours: operatingHours
    });
  } catch (error) {
    console.error('Error getting public open status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      is_open: true
    });
  }
};

// set clients interface language
export const setClientLanguage = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const clientId = req.clientId; // FROM MIDDLEWARE
    const { currentLang } = req.body;

    if (!clientId || !currentLang) {
      return res.status(400).json({ 
        success: false, 
        message: 'clientId and currentLang are required' 
      });
    }

    const [result] = await connection.execute(
      'UPDATE clients SET current_language = ? WHERE id = ?',
      [currentLang, clientId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Language updated successfully',
      clientId,
      currentLang
    });
  } catch (error) {
    console.error('Error updating client language:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating language'
    });
  } finally {
    if (connection) connection.release();
  }
};



// in cart products
export const getInCartProducts = async (req, res) => {
  let connection;
  try {
    const { userId } = req.query; // Get userId to check if offer is applied
    connection = await pool.getConnection();
    
    // We fetch products and JOIN them with active offers
    // We also use EXISTS on offer_usages to see if THIS user applied the offer
    const [products] = await connection.execute(`
      SELECT 
        p.*,
        c.name as category_name,
        o.id as offer_id,
        o.name as offer_name,
        o.discount_type,
        o.discount as offer_discount,
        o.end_at as offer_valid_until,
        op.limited_use,
        op.times_used,
        EXISTS(SELECT 1 FROM offer_usages ou WHERE ou.offer_id = o.id AND ou.user_id = ?) as is_applied_by_user
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN offer_products op ON p.id = op.product_id
      LEFT JOIN offers o ON op.offer_id = o.id 
        AND o.is_active = TRUE 
        AND o.start_at <= NOW() 
        AND o.end_at > NOW()
      WHERE p.for_cart = TRUE 
        AND p.active = TRUE
      ORDER BY p.created_at DESC
    `, [userId || null]);
    
    // Process the products to calculate final prices and set frontend flags
    const processedProducts = products.map(p => {
      const productPrice = parseFloat(p.price);
      const discountValue = parseFloat(p.offer_discount);
      const userHasApplied = Boolean(p.is_applied_by_user);
      
      // Check global restaurant limit
      const globalLimitNotReached = p.limited_use === null || p.times_used < p.limited_use;
      
      // The frontend recognizes it as an "Active Discount" only if applied and not sold out
      const hasActiveOffer = p.offer_id !== null;
      const discountApplied = hasActiveOffer && userHasApplied && globalLimitNotReached;

      let finalPrice = productPrice;
      if (discountApplied) {
        if (p.discount_type === 'percentage') {
          finalPrice = productPrice * (1 - discountValue / 100);
        } else {
          finalPrice = Math.max(0.01, productPrice - discountValue);
        }
      }

      return {
        ...p,
        price: productPrice,
        final_price: parseFloat(finalPrice.toFixed(2)),
        has_offer: hasActiveOffer,
        discount_applied: discountApplied,
        // Offer details for the frontend to display badges/labels
        offer_info: hasActiveOffer ? {
          offer_id: p.offer_id,
          offer_name: p.offer_name,
          discount_type: p.discount_type,
          discount_value: discountValue,
          is_applied: userHasApplied,
          can_use: globalLimitNotReached,
          reason: !userHasApplied ? 'Offer not applied' : (!globalLimitNotReached ? 'Limit reached' : null)
        } : null
      };
    });
    
    res.json({
      success: true,
      count: processedProducts.length,
      products: processedProducts
    });
    
  } catch (error) {
    console.error('Error fetching cart products:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching cart products',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};



// check reorder products with offers
export const checkLiveStatus = async (req, res) => {
  let connection;
  try {
    const { productIds, userId } = req.body;
    connection = await pool.getConnection();

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: "No product IDs provided" });
    }

    const placeholders = productIds.map(() => '?').join(',');

    const query = `
      SELECT 
        p.id as product_id,
        p.name,
        p.price as original_price,
        p.image,
        o.id as offer_id,
        o.name as offer_name,
        o.discount_type,
        o.discount as discount_value,
        o.end_at,
        op.limited_use,
        op.times_used,
        ou.usage_count as user_usage_count
      FROM products p
      INNER JOIN offer_products op ON p.id = op.product_id
      INNER JOIN offers o ON op.offer_id = o.id 
      INNER JOIN offer_usages ou ON o.id = ou.offer_id
      WHERE p.id IN (${placeholders})
        AND ou.user_id = ?
        AND o.is_active = TRUE 
        AND o.start_at <= NOW() 
        AND o.end_at > NOW()
      ORDER BY o.created_at DESC 
    `;

    const [rows] = await connection.execute(query, [...productIds, userId]);

    const validatedProducts = rows.map(row => {
      const originalPrice = parseFloat(row.original_price);
      let finalPrice = originalPrice;
      let hasOffer = true;
      let discountApplied = false;

      const globalLimitNotReached = row.limited_use === null || row.times_used < row.limited_use;
      
      if (globalLimitNotReached) {
        discountApplied = true;
        const discount = parseFloat(row.discount_value);
        
        // --- FIXED CALCULATION ---
        if (row.discount_type === 'percentage') {
          // 35 * (1 - 19/100) = 35 * 0.81 = 28.35
          finalPrice = originalPrice * (1 - (discount / 100));
        } else {
          finalPrice = Math.max(0.01, originalPrice - discount);
        }

        // --- INTEGRATED CUSTOM ROUNDING (.5 or 1.0) ---
        const integerPart = Math.floor(finalPrice);
        const decimalPart = finalPrice - integerPart;

        if (decimalPart > 0 && decimalPart <= 0.5) {
          finalPrice = integerPart + 0.5;
        } else if (decimalPart > 0.5) {
          finalPrice = integerPart + 1.0;
        }
      }

      return {
        id: row.product_id,
        name: row.name,
        image: row.image,
        price: originalPrice,
        final_price: parseFloat(finalPrice.toFixed(2)),
        has_offer: hasOffer,
        discount_applied: discountApplied,
        offer_info: {
          offer_id: row.offer_id,
          offer_name: row.offer_name,
          discount_type: row.discount_type,
          discount_value: row.discount_value,
          original_price: originalPrice,
          can_use_offer: discountApplied,
          times_used: row.times_used,
          max_uses: row.limited_use,
          valid_until: row.end_at
        },
        restaurant: 'Restaurant'
      };
    });

    const foundIds = validatedProducts.map(p => p.id);
    const missingIds = productIds.filter(id => !foundIds.includes(id));

    if (missingIds.length > 0) {
      const missingPlaceholders = missingIds.map(() => '?').join(',');
      const [normalProducts] = await connection.execute(
        `SELECT id, name, price, image FROM products WHERE id IN (${missingPlaceholders})`,
        missingIds
      );

      normalProducts.forEach(p => {
        validatedProducts.push({
          id: p.id,
          name: p.name,
          image: p.image,
          price: parseFloat(p.price),
          final_price: parseFloat(p.price),
          has_offer: false,
          discount_applied: false,
          offer_info: null,
          restaurant: 'Restaurant'
        });
      });
    }

    return res.status(200).json({ success: true, products: validatedProducts });

  } catch (error) {
    console.error("❌ Live Status Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  } finally {
    if (connection) connection.release();
  }
};


export const getProductNames = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT name FROM products ORDER BY name ASC
    `);

    const namesOnly = rows.map(p => p.name);

    res.json({ names: namesOnly });

  } catch (error) {
    console.error("❌ Error fetching product names:", error.message);
    res.status(500).json({ message: "Server error while fetching product names" });
  }
};

// profile statsig/db.js";
export const getProfileStats = async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(400).json({ message: "User ID missing from request." });
  }

  try {
    // 1. Execute queries. Using 'await' on each query inside Promise.all
    const [ordersResult, favoritesResult, clientsResult] = await Promise.all([
      pool.query("SELECT COUNT(*) AS count FROM orders WHERE user_id = ? AND status = ?", [userId, 'Delivered']),
      pool.query("SELECT COUNT(*) AS count FROM favorites WHERE client_id = ?", [userId]),
      pool.query("SELECT created_at FROM clients WHERE id = ?", [userId])
    ]);

    // 2. Extract the rows. In mysql2, the rows are in the first index [0]
    const orderRows = ordersResult[0];
    const favoriteRows = favoritesResult[0];
    const clientRows = clientsResult[0];

    // 3. Extract the actual values safely
    const deliveredCount = orderRows[0]?.count || 0;
    const favoritesCount = favoriteRows[0]?.count || 0;
    const memberSince = clientRows.length > 0 ? clientRows[0].created_at : new Date();

    return res.status(200).json({
      success: true,
      stats: {
        deliveredOrders: deliveredCount,
        favorites: favoritesCount,
        clientmemberSince: memberSince 
      }
    });

  } catch (error) {
    console.error("❌ Database Error in getProfileStats:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error fetching profile stats." 
    });
  }
};