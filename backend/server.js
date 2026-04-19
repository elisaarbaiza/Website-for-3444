require("dotenv").config();
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const cors = require("cors");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { Pool } = require("pg");

const app = express();
const server = http.createServer(app);
const projectRoot = path.join(__dirname, "..");
const sessionMiddleware = session({
  secret: "change-this-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    // Allow cross-site cookies when served over HTTPS (for Amplify + backend on Render)
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  },
});

// Postgres connection pool (for future persistence)
// Use DATABASE_SSL=true when connecting locally to hosted databases like Render Postgres.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "true" || process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function initDb() {
  // Create tables if they don't exist yet
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
  `);
  // Older DBs have a "password" column with NOT NULL — make it nullable so it
  // doesn't block inserts that only use password_hash.
  await pool.query(`
    ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
  `).catch(() => {});
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
  `);
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_items INTEGER[] DEFAULT ARRAY[]::INTEGER[];
  `);
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
  `);
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx ON users(username) WHERE username IS NOT NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      price NUMERIC(10, 2) NOT NULL,
      category TEXT,
      is_sold BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS image_url TEXT;`);
  await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS is_sold BOOLEAN DEFAULT FALSE;`);

  // Fix cart table column names if created with old schema
  await pool.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cart' AND column_name='product_id') THEN
        ALTER TABLE cart RENAME COLUMN product_id TO item_id;
      END IF;
    END $$;
  `).catch(() => {});
  await pool.query(`ALTER TABLE cart ADD COLUMN IF NOT EXISTS item_id INTEGER REFERENCES items(id) ON DELETE CASCADE;`).catch(() => {});
  await pool.query(`ALTER TABLE cart ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;`).catch(() => {});
  await pool.query(`ALTER TABLE cart ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;`).catch(() => {});
  await pool.query(`ALTER TABLE cart ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cart (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, item_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      seller_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      price NUMERIC(10, 2) NOT NULL,
      is_sold BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Backward-compatible migration: older DBs may still have seller_id as INTEGER
  // with an FK to users(id). Firebase user IDs are strings, so we remove legacy FKs
  // and store seller_id as TEXT.
  await pool.query(`
    ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_seller_id_fkey;
  `);
  await pool.query(`
    ALTER TABLE products
    ALTER COLUMN seller_id TYPE TEXT
    USING seller_id::TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

const cartRoutes = require('./routes/cartRoutes');
const productRoutes = require('./routes/productRoutes');

// Parse JSON and form-encoded bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/cart', cartRoutes);
app.use('/products', productRoutes);

// Log incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// CORS to allow frontend from Amplify/localhost to call this backend
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://main.d3b9nx7tb3jlu.amplifyapp.com",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);

function isUntEmail(email) {
  const lower = String(email || "").toLowerCase().trim();
  return lower.endsWith("@my.unt.edu") || lower.endsWith("@unt.edu");
}

async function getUserById(id) {
  const result = await pool.query(
    `SELECT id, email, username, bio, password_hash, email_verified, favorite_items
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  return result.rows[0] || null;
}

async function getUserByEmail(email) {
  const result = await pool.query(
    `SELECT id, email, username, bio, password_hash, email_verified, favorite_items
     FROM users
     WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
     LIMIT 1`,
    [email],
  );
  return result.rows[0] || null;
}

async function getUserByUsername(username) {
  const result = await pool.query(
    `SELECT id, email, username, bio, password_hash, email_verified, favorite_items
     FROM users
     WHERE LOWER(TRIM(username)) = LOWER(TRIM($1))
     LIMIT 1`,
    [username],
  );
  return result.rows[0] || null;
}

//product getter
async function getItems(category, sort, search) {
  let query = `SELECT i.*, COALESCE(NULLIF(u.username, ''), SPLIT_PART(u.email, '@', 1), 'user-' || u.id::TEXT) AS seller_username FROM items i JOIN users u ON u.id = i.seller_id`;
  const values = [];
  const conditions = [];

  if (category) {
    values.push(category);
    conditions.push(`i.category = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(i.title ILIKE $${values.length} OR i.description ILIKE $${values.length})`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }

  if (sort === 'asc') {
    query += ` ORDER BY i.price ASC`;
  } else if (sort === 'desc') {
    query += ` ORDER BY i.price DESC`;
  } else {
    query += ` ORDER BY i.created_at DESC`;
  }

  const result = await pool.query(query, values);
  return result.rows;
}

async function getItemById(id) {
  const result = await pool.query(
    `SELECT i.*, COALESCE(NULLIF(u.username, ''), SPLIT_PART(u.email, '@', 1), 'user-' || u.id::TEXT) AS seller_username
     FROM items i
     JOIN users u ON u.id = i.seller_id
     WHERE i.id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

async function createItem(seller_id, title, description, price, category, image_url) {
  const result = await pool.query(
    `INSERT INTO items (seller_id, title, description, price, category, image_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [seller_id, title, description, price, category, image_url]
  );
  return result.rows[0];
}

async function getItemsBySellerId(seller_id) {
  const result = await pool.query(
    `SELECT i.*, COALESCE(NULLIF(u.username, ''), SPLIT_PART(u.email, '@', 1), 'user-' || u.id::TEXT) AS seller_username
     FROM items i
     JOIN users u ON u.id = i.seller_id
     WHERE i.seller_id = $1
     ORDER BY i.created_at DESC`,
    [seller_id]
  );
  return result.rows;
}

async function addFavoriteItem(userId, itemId) {
  const result = await pool.query(
    `UPDATE users
     SET favorite_items = array_append(favorite_items, $2)
     WHERE id = $1 AND NOT ($2 = ANY(favorite_items))
     RETURNING favorite_items`,
    [userId, itemId]
  );
  return result.rows[0];
}

async function removeFavoriteItem(userId, itemId) {
  const result = await pool.query(
    `UPDATE users
     SET favorite_items = array_remove(favorite_items, $2)
     WHERE id = $1
     RETURNING favorite_items`,
    [userId, itemId]
  );
  return result.rows[0];
}

async function getFavoriteItems(userId) {
  const result = await pool.query(
    `SELECT i.*, COALESCE(NULLIF(s.username, ''), SPLIT_PART(s.email, '@', 1), 'user-' || s.id::TEXT) AS seller_username
     FROM items i
     JOIN users u ON i.id = ANY(u.favorite_items)
     JOIN users s ON s.id = i.seller_id
     WHERE u.id = $1`,
    [userId]
  );
  return result.rows;
}

// Session middleware to track logged-in users
app.use(sessionMiddleware);

// Optional dev-only auto-login shortcut.
// Enable by starting server with: SKIP_AUTH_FOR_DEV=true node backend/server.js
if (process.env.SKIP_AUTH_FOR_DEV === "true") {
  app.use(async (req, res, next) => {
    try {
      if (!req.session.userId) {
        const result = await pool.query(`SELECT id FROM users ORDER BY id ASC LIMIT 1`);
        if (result.rows[0]) {
          req.session.userId = result.rows[0].id;
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  });
}

// Email transport for verification emails (configure via env vars)
// Uses Amazon SES SMTP. You should set these env vars on Render:
// - EMAIL_USER: the verified "from" email identity in SES
// - SES_SMTP_USERNAME: SMTP username from SES
// - SES_SMTP_PASSWORD: SMTP password from SES
// - SES_REGION: SES region (defaults to us-west-2 / Oregon)
const sesRegion = process.env.SES_REGION || "us-west-2";
const transporter = nodemailer.createTransport({
  host: `email-smtp.${sesRegion}.amazonaws.com`,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SES_SMTP_USERNAME,
    pass: process.env.SES_SMTP_PASSWORD,
  },
});

// Allow Socket.IO connections from localhost/allowed origins
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
io.engine.use(sessionMiddleware);

// In-memory conversation store (per pair of users)
// NOTE: This is not permanent storage; data is lost if the server restarts.
// conversations: Map<conversationId, { id, participants: [userA, userB], messages: [{ sender, text, createdAt }] }>
const conversations = new Map();

function getConversationId(userA, userB) {
  const a = String(userA || "").trim().toLowerCase();
  const b = String(userB || "").trim().toLowerCase();
  if (!a || !b) return null;
  const sorted = [a, b].sort();
  return `${sorted[0]}::${sorted[1]}`;
}

function ensureConversation(currentUser, otherUser) {
  const id = getConversationId(currentUser, otherUser);
  if (!id) return null;
  if (!conversations.has(id)) {
    conversations.set(id, {
      id,
      participants: [currentUser, otherUser],
      messages: [],
    });
  }
  return conversations.get(id);
}

async function listChatContactsForUser(userId) {
  const contactIds = new Set();
  for (const convo of conversations.values()) {
    const participants = (convo.participants || []).map((value) => Number(value));
    if (!participants.includes(userId)) continue;
    const otherId = participants.find((id) => id !== userId);
    if (Number.isInteger(otherId)) {
      contactIds.add(otherId);
    }
  }

  if (contactIds.size === 0) {
    return [];
  }

  const ids = [...contactIds];
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.username,
       u.bio,
       CASE
         WHEN EXISTS (SELECT 1 FROM items i WHERE i.seller_id = u.id) THEN 'seller'
         ELSE 'buyer'
       END AS role
     FROM users u
     WHERE u.id = ANY($1::int[])
     ORDER BY COALESCE(NULLIF(u.username, ''), SPLIT_PART(u.email, '@', 1)) ASC`,
    [ids]
  );
  return result.rows;
}

// Authentication helpers
async function requireLogin(req, res, next) {
  try {
    const user = await getUserById(req.session.userId);
    if (!user /* || !user.email_verified */) {
      return res.status(401).json({
        error: "Login is required for this action.",
      });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Sign up with UNT email
app.post("/signup", async (req, res) => {
  const { email, password, username, bio } = req.body || {};

  if (!email || !password || !username) {
    return res.status(400).json({ error: "Email, username, and password are required." });
  }

  if (!isUntEmail(email)) {
    return res
      .status(400)
      .json({ error: "You must use a UNT email (@my.unt.edu or @unt.edu)." });
  }

  const trimmedUsername = String(username).trim();
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(trimmedUsername)) {
    return res
      .status(400)
      .json({ error: "Username must be 3-30 characters and only contain letters, numbers, or underscores." });
  }

  const usernameOwner = await getUserByUsername(trimmedUsername);
  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedBio = String(bio || "").trim() || null;
  let user = await getUserByEmail(normalizedEmail);

  if (usernameOwner && (!user || usernameOwner.id !== user.id)) {
    return res.status(400).json({ error: "Username is already taken." });
  }

  if (!user) {
    const insertResult = await pool.query(
      `INSERT INTO users (email, username, bio, password_hash, email_verified)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, email, username, bio, password_hash, email_verified`,
      [normalizedEmail, trimmedUsername, normalizedBio, passwordHash],
    );
    user = insertResult.rows[0];
  } else {
    const updateResult = await pool.query(
      `UPDATE users
       SET username = $1,
           bio = $2,
           password_hash = $3,
           email_verified = false
       WHERE id = $4
       RETURNING id, email, username, bio, password_hash, email_verified`,
      [trimmedUsername, normalizedBio, passwordHash, user.id],
    );
    user = updateResult.rows[0];
    await pool.query(`DELETE FROM verification_tokens WHERE user_id = $1`, [user.id]);
  }

  const token = crypto.randomBytes(32).toString("hex");
  await pool.query(`INSERT INTO verification_tokens (token, user_id) VALUES ($1, $2)`, [
    token,
    user.id,
  ]);

  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const verifyUrl = `${baseUrl}/verify?token=${token}`;

  // try {
  //   await transporter.sendMail({
  //     from: process.env.EMAIL_USER,
  //     to: user.email,
  //     subject: "Verify your UNT email for Eagl'd",
  //     text: `Click this link to verify your email: ${verifyUrl}`,
  //   });
  // } catch (err) {
  //   console.error("Error sending verification email:", err);
  //   return res.status(500).json({ error: "Could not send verification email." });
  // }

  res.json({
    message: "Signup successful. DO NOT Check your UNT email for a verification link.",
  });
});

// Log in with UNT email
app.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = await getUserByEmail(email);

  if (!user) {
    return res.status(400).json({ error: "Invalid email or password." });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(400).json({ error: "Invalid email or password." });
  }

  // if (!user.email_verified) {
  //   return res.status(403).json({ error: "Please verify your UNT email before logging in." });
  // }

  req.session.userId = user.id;

  res.json({
    message: "Logged in successfully.",
    email: user.email,
    username: user.username,
    bio: user.bio,
  });
});

// Log out
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out." });
  });
});

// Get currently logged-in user
app.get("/api/me", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not logged in." });
    }
    const user = await getUserById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    // Return public user profile data
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      bio: user.bio,
      favorite_items: user.favorite_items || [],
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Server error." });
  }
});

// Update currently logged-in user's profile fields
app.put("/api/me", requireLogin, async (req, res) => {
  try {
    const { bio } = req.body || {};
    const normalizedBio = String(bio || "").trim();

    if (normalizedBio.length > 500) {
      return res.status(400).json({ error: "Bio must be 500 characters or fewer." });
    }

    const result = await pool.query(
      `UPDATE users
       SET bio = $1
       WHERE id = $2
       RETURNING id, email, username, bio, favorite_items`,
      [normalizedBio || null, req.user.id],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

app.get("/api/chat/contacts", requireLogin, async (req, res) => {
  try {
    const contacts = await listChatContactsForUser(req.user.id);
    const mapped = contacts.map((contact) => {
      const convoId = getConversationId(req.user.id, contact.id);
      const convo = conversations.get(convoId);
      const lastMessage = convo?.messages?.[convo.messages.length - 1] || null;

      return {
        id: contact.id,
        email: contact.email,
        username: contact.username,
        name: contact.username || String(contact.email || "").split("@")[0] || `user-${contact.id}`,
        role: contact.role || "buyer",
        bio: contact.bio,
        lastMessage: lastMessage?.text || "",
        lastMessageAt: lastMessage?.createdAt || null,
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error("Error fetching chat contacts:", err);
    res.status(500).json({ error: "Failed to fetch contacts." });
  }
});

app.get("/api/chat/conversations/:otherUserId", requireLogin, async (req, res) => {
  const { otherUserId } = req.params;
  const otherId = Number(otherUserId);

  if (!Number.isInteger(otherId)) {
    return res.status(400).json({ error: "Invalid user id." });
  }

  if (otherId === req.user.id) {
    return res.status(400).json({ error: "Cannot open a conversation with yourself." });
  }

  const convo = ensureConversation(req.user.id, otherId);
  if (!convo) {
    return res.status(400).json({ error: "Invalid conversation." });
  }

  res.json({
    conversationId: convo.id,
    messages: convo.messages,
  });
});

app.post("/api/chat/open/:otherUserId", requireLogin, async (req, res) => {
  const { otherUserId } = req.params;
  const otherId = Number(otherUserId);

  if (!Number.isInteger(otherId)) {
    return res.status(400).json({ error: "Invalid user id." });
  }

  if (otherId === req.user.id) {
    return res.status(400).json({ error: "Cannot open a conversation with yourself." });
  }

  const otherUser = await getUserById(otherId);
  if (!otherUser) {
    return res.status(404).json({ error: "Seller not found." });
  }

  const convo = ensureConversation(req.user.id, otherId);
  if (!convo) {
    return res.status(400).json({ error: "Invalid conversation." });
  }

  const roleResult = await pool.query(
    `SELECT CASE
        WHEN EXISTS (SELECT 1 FROM items i WHERE i.seller_id = $1) THEN 'seller'
        ELSE 'buyer'
      END AS role`,
    [otherId]
  );

  res.json({
    conversationId: convo.id,
    contact: {
      id: otherUser.id,
      email: otherUser.email,
      username: otherUser.username,
      name: otherUser.username || String(otherUser.email || "").split("@")[0] || `user-${otherUser.id}`,
      role: roleResult.rows[0]?.role || "buyer",
      bio: otherUser.bio || null,
    },
    messages: convo.messages,
  });
});

// Email verification endpoint
app.get("/verify", async (req, res) => {
  const { token } = req.query || {};
  const tokenResult = await pool.query(
    `SELECT token, user_id FROM verification_tokens WHERE token = $1 LIMIT 1`,
    [token],
  );
  const tokenRow = tokenResult.rows[0];
  if (!tokenRow) {
    return res.status(400).send("Invalid or expired verification link.");
  }

  const user = await getUserById(tokenRow.user_id);
  if (!user) {
    return res.status(400).send("User not found.");
  }

  await pool.query(`UPDATE users SET email_verified = true WHERE id = $1`, [user.id]);
  await pool.query(`DELETE FROM verification_tokens WHERE token = $1`, [token]);

  res.send("Email verified. You can now log in.");
});

// Forgot password - send reset link
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const user = await getUserByEmail(email);

  // For security, always return success even if user not found
  if (!user) {
    return res.json({
      message: "If that email is registered, a reset link has been sent.",
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  await pool.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [user.id]);
  await pool.query(`INSERT INTO password_reset_tokens (token, user_id) VALUES ($1, $2)`, [
    token,
    user.id,
  ]);

  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const resetUrl = `${baseUrl}/reset-password.html?token=${token}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Reset your Eagl'd password",
      text: `Click this link to reset your password: ${resetUrl}`,
    });
  } catch (err) {
    console.error("Error sending reset email:", err);
    return res.status(500).json({ error: "Could not send reset email." });
  }

  res.json({
    message: "If that email is registered, a reset link has been sent.",
  });
});

// Reset password
app.post("/reset-password", async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: "Token and new password are required." });
  }

  const tokenResult = await pool.query(
    `SELECT token, user_id FROM password_reset_tokens WHERE token = $1 LIMIT 1`,
    [token],
  );
  const tokenRow = tokenResult.rows[0];
  if (!tokenRow) {
    return res.status(400).json({ error: "Invalid or expired reset link." });
  }

  const user = await getUserById(tokenRow.user_id);
  if (!user) {
    return res.status(400).json({ error: "User not found." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, user.id]);
  await pool.query(`DELETE FROM password_reset_tokens WHERE token = $1`, [token]);

  res.json({ message: "Password has been reset." });
});

// Example protected route (for future sell/buy/chat actions)
app.post("/protected-example", requireLogin, (req, res) => {
  res.json({ message: `Hello, ${req.user.email}. You are authenticated.` });
});

// Create a new item
app.post("/api/items", requireLogin, async (req, res) => {
  try {
    const { title, description, price, category, image_url } = req.body;
    if (!title || !price) {
      return res.status(400).json({ error: "Title and price are required." });
    }
    const newItem = await createItem(req.user.id, title, description, price, category, image_url);
    res.status(201).json(newItem);
  } catch (err) {
    console.error("Error creating item:", err);
    res.status(500).json({ error: "Failed to create item." });
  }
});

// Get currently logged-in user's items
app.get("/api/my-items", requireLogin, async (req, res) => {
  try {
    const items = await getItemsBySellerId(req.user.id);
    res.json(items);
  } catch (err) {
    console.error("Error fetching user items:", err);
    res.status(500).json({ error: "Failed to fetch your items." });
  }
});

// Update one of the logged-in user's items
app.put("/api/items/:id", requireLogin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image_url, price, category } = req.body || {};

    const result = await pool.query(
      `UPDATE items
       SET title = $1,
           description = $2,
           image_url = $3,
           price = $4,
           category = $5
       WHERE id = $6 AND seller_id = $7
       RETURNING *`,
      [title, description, image_url, price, category, id, req.user.id],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Item not found." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating item:", err);
    res.status(500).json({ error: "Failed to update item." });
  }
});

// Mark one of the logged-in user's items as sold
app.put("/api/items/:id/mark-sold", requireLogin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE items
       SET is_sold = TRUE
       WHERE id = $1 AND seller_id = $2
       RETURNING *`,
      [id, req.user.id],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Item not found." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error marking item as sold:", err);
    res.status(500).json({ error: "Failed to mark item as sold." });
  }
});

// Delete one of the logged-in user's items
app.delete("/api/items/:id", requireLogin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM items
       WHERE id = $1 AND seller_id = $2
       RETURNING id`,
      [id, req.user.id],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Item not found." });
    }

    res.json({ message: "Item deleted." });
  } catch (err) {
    console.error("Error deleting item:", err);
    res.status(500).json({ error: "Failed to delete item." });
  }
});

// Get cart items for logged-in user
app.get("/api/cart", requireLogin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.quantity, c.item_id,
              i.title, i.image_url, i.price
       FROM cart c
       JOIN items i ON c.item_id = i.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ error: "Failed to fetch cart." });
  }
});

// Add item to cart (or increment quantity if already in cart)
app.post("/api/cart", requireLogin, async (req, res) => {
  try {
    const { item_id, quantity = 1 } = req.body;
    const existing = await pool.query(
      `SELECT id, quantity FROM cart WHERE user_id = $1 AND item_id = $2`,
      [req.user.id, item_id]
    );
    if (existing.rows.length > 0) {
      const updated = await pool.query(
        `UPDATE cart SET quantity = quantity + $1
         WHERE user_id = $2 AND item_id = $3 RETURNING *`,
        [quantity, req.user.id, item_id]
      );
      return res.json(updated.rows[0]);
    }
    const result = await pool.query(
      `INSERT INTO cart (user_id, item_id, quantity) VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, item_id, quantity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding to cart:", err.message, err.detail || "");
    res.status(500).json({ error: err.message || "Failed to add item to cart." });
  }
});

// Update quantity of a cart item
app.put("/api/cart/:id", requireLogin, async (req, res) => {
  try {
    const { quantity } = req.body;
    const result = await pool.query(
      `UPDATE cart SET quantity = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [quantity, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating cart:", err);
    res.status(500).json({ error: "Failed to update cart." });
  }
});

// Remove item from cart
app.delete("/api/cart/:id", requireLogin, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM cart WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ message: "Item removed from cart." });
  } catch (err) {
    console.error("Error removing from cart:", err);
    res.status(500).json({ error: "Failed to remove item from cart." });
  }
});

// Add an item to favorites
app.post("/api/favorites/:itemId", requireLogin, async (req, res) => {
  try {
    const { itemId } = req.params;
    await addFavoriteItem(req.user.id, parseInt(itemId, 10));
    res.status(200).json({ message: "Item added to favorites." });
  } catch (err) {
    console.error("Error adding favorite:", err);
    res.status(500).json({ error: "Failed to add favorite." });
  }
});

// Remove an item from favorites
app.delete("/api/favorites/:itemId", requireLogin, async (req, res) => {
  try {
    const { itemId } = req.params;
    await removeFavoriteItem(req.user.id, parseInt(itemId, 10));
    res.status(200).json({ message: "Item removed from favorites." });
  } catch (err) {
    console.error("Error removing favorite:", err);
    res.status(500).json({ error: "Failed to remove favorite." });
  }
});

// Get all favorite items for the logged-in user
app.get("/api/favorites", requireLogin, async (req, res) => {
  try {
    const items = await getFavoriteItems(req.user.id);
    res.json(items);
  } catch (err) {
    console.error("Error fetching favorites:", err);
    res.status(500).json({ error: "Failed to fetch favorites." });
  }
});

// Pretty URLs: GET /login and GET /signup serve the HTML pages. (POST /login and POST /signup are JSON APIs above.)
app.get("/login", (_req, res) => {
  res.sendFile(path.join(projectRoot, "login.html"));
});
app.get("/signup", (_req, res) => {
  res.sendFile(path.join(projectRoot, "signup.html"));
});

//PRODUCT STUFF
app.get("/items", async (req, res) => {
  try {
    const { category, sort, search } = req.query;
    const items = await getItems(category, sort, search);
    res.json(items);
  } catch (err) {
    console.error("Error fetching items:", err);
    res.status(500).json({ error: "Failed to fetch items." });
  }
});

app.get("/items/:id", async (req, res) => {
  try {
    const item = await getItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Item not found." });
    }
    res.json(item);
  } catch (err) {
    console.error("Error fetching item:", err);
    res.status(500).json({ error: "Failed to fetch item." });
  }
});

// Serve all static files (HTML, CSS, JS, images) from project root.
// Use main.html as the default document for "/" (Eagl'd homepage; former index.html).
app.use(express.static(projectRoot, { index: "main.html" }));

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  const sessionUserId = socket.request?.session?.userId;
  const currentUserId = Number(sessionUserId);

  if (!Number.isInteger(currentUserId)) {
    socket.emit("chat error", { message: "Unauthorized socket session." });
    socket.disconnect(true);
    return;
  }

  socket.join(`user:${currentUserId}`);

  socket.on("join conversation", (payload) => {
    const { otherUserId } = payload || {};
    const otherUser = Number(otherUserId);
    const convo = ensureConversation(currentUserId, otherUser);
    if (!convo) {
      return;
    }

    socket.join(convo.id);
    socket.data.currentUser = currentUserId;
    socket.data.currentConversationId = convo.id;

    socket.emit("conversation joined", {
      conversationId: convo.id,
      otherUserId: otherUser,
      messages: convo.messages,
    });
  });

  socket.on("chat message", (data) => {
    const { otherUserId, text } = data || {};
    const otherUser = Number(otherUserId);
    if (!text || !Number.isInteger(otherUser)) return;

    const convo = ensureConversation(currentUserId, otherUser);
    if (!convo) return;

    const message = {
      id: crypto.randomUUID(),
      senderId: currentUserId,
      receiverId: otherUser,
      text: String(text).trim(),
      createdAt: Date.now(),
    };

    if (!message.text) return;
    convo.messages.push(message);

    io.to(convo.id).emit("chat message", {
      conversationId: convo.id,
      message,
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
const SKIP_DB_FOR_DEV = process.env.SKIP_DB_FOR_DEV === "true";

function startServer() {
  server.listen(PORT, () => {
    console.log(`Chat server running on port ${PORT}`);
  });
}

// Initialize database (tables) then start server.
// In local UI-only development, you can bypass DB startup with SKIP_DB_FOR_DEV=true.
if (SKIP_DB_FOR_DEV) {
  console.warn("Starting without database initialization (SKIP_DB_FOR_DEV=true).");
  startServer();
} else {
  initDb()
    .then(() => {
      startServer();
    })
    .catch((err) => {
      console.error("Failed to initialize database:", err);
      process.exit(1);
    });
}
