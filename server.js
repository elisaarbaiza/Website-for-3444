require('dotenv').config();
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);

// Postgres connection pool (for future persistence)
// Use DATABASE_SSL=true when connecting locally to hosted databases like Render Postgres.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production'
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
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      price NUMERIC(10, 2) NOT NULL,
      category TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
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
}

// Parse JSON and form-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS to allow frontend from Amplify/localhost to call this backend
const allowedOrigins = [
  'http://localhost:3000',
  'https://main.d3b9nx7tb3jlu.amplifyapp.com',
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
  })
);

function isUntEmail(email) {
  const lower = String(email || '').toLowerCase().trim();
  return lower.endsWith('@my.unt.edu') || lower.endsWith('@unt.edu');
}

async function getUserById(id) {
  const result = await pool.query(
    `SELECT id, email, password_hash, email_verified FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

async function getUserByEmail(email) {
  const result = await pool.query(
    `SELECT id, email, password_hash, email_verified
     FROM users
     WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
     LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
}

// Session middleware to track logged-in users
app.use(
  session({
    secret: 'change-this-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      // Allow cross-site cookies when served over HTTPS (for Amplify + backend on Render)
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

// Optional dev-only auto-login shortcut.
// Enable by starting server with: SKIP_AUTH_FOR_DEV=true node server.js
if (process.env.SKIP_AUTH_FOR_DEV === 'true') {
  app.use(async (req, res, next) => {
    try {
      if (!req.session.userId) {
        const result = await pool.query(
          `SELECT id FROM users ORDER BY id ASC LIMIT 1`
        );
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
const sesRegion = process.env.SES_REGION || 'us-west-2';
const transporter = nodemailer.createTransport({
  host: `email-smtp.${sesRegion}.amazonaws.com`,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SES_SMTP_USERNAME,
    pass: process.env.SES_SMTP_PASSWORD,
  },
});

// Allow Socket.IO connections from any origin (Amplify, Render, localhost)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory conversation store (per pair of users)
// NOTE: This is not permanent storage; data is lost if the server restarts.
// conversations: Map<conversationId, { id, participants: [userA, userB], messages: [{ sender, text, createdAt }] }>
const conversations = new Map();

function getConversationId(userA, userB) {
  const a = String(userA || '').trim().toLowerCase();
  const b = String(userB || '').trim().toLowerCase();
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
      messages: []
    });
  }
  return conversations.get(id);
}

// Authentication helpers
async function requireLogin(req, res, next) {
  try {
    const user = await getUserById(req.session.userId);
    if (!user || !user.email_verified) {
      return res.status(401).json({
        error: 'Login with a verified UNT email is required for this action.',
      });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Sign up with UNT email
app.post('/signup', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (!isUntEmail(email)) {
    return res
      .status(400)
      .json({ error: 'You must use a UNT email (@my.unt.edu or @unt.edu).' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedEmail = email.trim().toLowerCase();
  let user = await getUserByEmail(normalizedEmail);

  if (!user) {
    const insertResult = await pool.query(
      `INSERT INTO users (email, password_hash, email_verified)
       VALUES ($1, $2, false)
       RETURNING id, email, password_hash, email_verified`,
      [normalizedEmail, passwordHash]
    );
    user = insertResult.rows[0];
  } else {
    const updateResult = await pool.query(
      `UPDATE users
       SET password_hash = $1, email_verified = false
       WHERE id = $2
       RETURNING id, email, password_hash, email_verified`,
      [passwordHash, user.id]
    );
    user = updateResult.rows[0];
    await pool.query(`DELETE FROM verification_tokens WHERE user_id = $1`, [user.id]);
  }

  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO verification_tokens (token, user_id) VALUES ($1, $2)`,
    [token, user.id]
  );

  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const verifyUrl = `${baseUrl}/verify?token=${token}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Verify your UNT email for Eagl'd",
      text: `Click this link to verify your email: ${verifyUrl}`,
    });
  } catch (err) {
    console.error('Error sending verification email:', err);
    return res.status(500).json({ error: 'Could not send verification email.' });
  }

  res.json({
    message: 'Signup successful. Check your UNT email for a verification link.',
  });
});

// Log in with UNT email
app.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await getUserByEmail(email);

  if (!user) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }

  if (!user.email_verified) {
    return res
      .status(403)
      .json({ error: 'Please verify your UNT email before logging in.' });
  }

  req.session.userId = user.id;

  res.json({
    message: 'Logged in successfully.',
    email: user.email,
  });
});

// Log out
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out.' });
  });
});

// Email verification endpoint
app.get('/verify', async (req, res) => {
  const { token } = req.query || {};
  const tokenResult = await pool.query(
    `SELECT token, user_id FROM verification_tokens WHERE token = $1 LIMIT 1`,
    [token]
  );
  const tokenRow = tokenResult.rows[0];
  if (!tokenRow) {
    return res.status(400).send('Invalid or expired verification link.');
  }

  const user = await getUserById(tokenRow.user_id);
  if (!user) {
    return res.status(400).send('User not found.');
  }

  await pool.query(`UPDATE users SET email_verified = true WHERE id = $1`, [user.id]);
  await pool.query(`DELETE FROM verification_tokens WHERE token = $1`, [token]);

  res.send('Email verified. You can now log in.');
});

// Forgot password - send reset link
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const user = await getUserByEmail(email);

  // For security, always return success even if user not found
  if (!user) {
    return res.json({
      message: 'If that email is registered, a reset link has been sent.',
    });
  }

  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [user.id]);
  await pool.query(
    `INSERT INTO password_reset_tokens (token, user_id) VALUES ($1, $2)`,
    [token, user.id]
  );

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
    console.error('Error sending reset email:', err);
    return res.status(500).json({ error: 'Could not send reset email.' });
  }

  res.json({
    message: 'If that email is registered, a reset link has been sent.',
  });
});

// Reset password
app.post('/reset-password', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  const tokenResult = await pool.query(
    `SELECT token, user_id FROM password_reset_tokens WHERE token = $1 LIMIT 1`,
    [token]
  );
  const tokenRow = tokenResult.rows[0];
  if (!tokenRow) {
    return res.status(400).json({ error: 'Invalid or expired reset link.' });
  }

  const user = await getUserById(tokenRow.user_id);
  if (!user) {
    return res.status(400).json({ error: 'User not found.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
    passwordHash,
    user.id,
  ]);
  await pool.query(`DELETE FROM password_reset_tokens WHERE token = $1`, [token]);

  res.json({ message: 'Password has been reset.' });
});

// Example protected route (for future sell/buy/chat actions)
app.post('/protected-example', requireLogin, (req, res) => {
  res.json({ message: `Hello, ${req.user.email}. You are authenticated.` });
});

// Pretty URLs: GET /login and GET /signup serve the HTML pages. (POST /login and POST /signup are JSON APIs above.)
app.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});
app.get('/signup', (_req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

// Serve all static files (HTML, CSS, JS, images) from this folder
// Use main.html as the default document for "/" (Eagl'd homepage; former index.html).
app.use(express.static(__dirname, { index: 'main.html' }));

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join conversation', (payload) => {
    const { currentUser, otherUser } = payload || {};
    const convo = ensureConversation(currentUser, otherUser);
    if (!convo) {
      return;
    }

    socket.join(convo.id);
    socket.data.currentUser = currentUser;
    socket.data.currentConversationId = convo.id;

    socket.emit('conversation joined', {
      conversationId: convo.id,
      otherUser,
      messages: convo.messages
    });
  });

  socket.on('chat message', (data) => {
    const { conversationId, user, text } = data || {};
    if (!conversationId || !text || !user) return;

    const convo = conversations.get(conversationId);
    if (!convo) return;

    const message = {
      sender: user,
      text,
      createdAt: new Date().toISOString()
    };

    convo.messages.push(message);

    io.to(conversationId).emit('chat message', {
      conversationId,
      user: message.sender,
      text: message.text,
      createdAt: message.createdAt
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
const SKIP_DB_FOR_DEV = process.env.SKIP_DB_FOR_DEV === 'true';

function startServer() {
  server.listen(PORT, () => {
    console.log(`Chat server running on port ${PORT}`);
  });
}

// Initialize database (tables) then start server.
// In local UI-only development, you can bypass DB startup with SKIP_DB_FOR_DEV=true.
if (SKIP_DB_FOR_DEV) {
  console.warn('Starting without database initialization (SKIP_DB_FOR_DEV=true).');
  startServer();
} else {
  initDb()
    .then(() => {
      startServer();
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

