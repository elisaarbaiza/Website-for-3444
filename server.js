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
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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

// Simple in-memory "database" for demo purposes
// In a real app, replace this with a real database.
// users: [{ id, email, passwordHash, emailVerified }]
const users = [];
// verificationTokens: Map<token, userId>
const verificationTokens = new Map();
// passwordResetTokens: Map<token, userId>
const passwordResetTokens = new Map();

function isUntEmail(email) {
  const lower = String(email || '').toLowerCase().trim();
  return lower.endsWith('@my.unt.edu') || lower.endsWith('@unt.edu');
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
  app.use((req, res, next) => {
    if (!req.session.userId && users.length > 0) {
      req.session.userId = users[0].id;
    }
    next();
  });
}

// Email transport for verification emails (configure via env vars)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your SMTP provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
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
function requireLogin(req, res, next) {
  const user = users.find((u) => u.id === req.session.userId);
  if (!user || !user.emailVerified) {
    return res.status(401).json({
      error: 'Login with a verified UNT email is required for this action.',
    });
  }
  req.user = user;
  next();
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

  let user = users.find(
    (u) => u.email.toLowerCase().trim() === email.toLowerCase().trim()
  );

  const passwordHash = await bcrypt.hash(password, 10);

  if (!user) {
    // First time this UNT email is registering
    user = {
      id: users.length + 1,
      email: email.trim(),
      passwordHash,
      emailVerified: false,
    };
    users.push(user);
  } else {
    // Email already seen before: update password and re-send verification link
    user.passwordHash = passwordHash;
    user.emailVerified = false;
  }

  const token = crypto.randomBytes(32).toString('hex');
  verificationTokens.set(token, user.id);

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

  const user = users.find(
    (u) => u.email.toLowerCase().trim() === email.toLowerCase().trim()
  );

  if (!user) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }

  if (!user.emailVerified) {
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
app.get('/verify', (req, res) => {
  const { token } = req.query || {};
  const userId = verificationTokens.get(token);
  if (!userId) {
    return res.status(400).send('Invalid or expired verification link.');
  }

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(400).send('User not found.');
  }

  user.emailVerified = true;
  verificationTokens.delete(token);

  res.send('Email verified. You can now log in.');
});

// Forgot password - send reset link
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const user = users.find(
    (u) => u.email.toLowerCase().trim() === String(email).toLowerCase().trim()
  );

  // For security, always return success even if user not found
  if (!user) {
    return res.json({
      message: 'If that email is registered, a reset link has been sent.',
    });
  }

  const token = crypto.randomBytes(32).toString('hex');
  passwordResetTokens.set(token, user.id);

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

  const userId = passwordResetTokens.get(token);
  if (!userId) {
    return res.status(400).json({ error: 'Invalid or expired reset link.' });
  }

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(400).json({ error: 'User not found.' });
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  passwordResetTokens.delete(token);

  res.json({ message: 'Password has been reset.' });
});

// Example protected route (for future sell/buy/chat actions)
app.post('/protected-example', requireLogin, (req, res) => {
  res.json({ message: `Hello, ${req.user.email}. You are authenticated.` });
});

// Serve all static files (HTML, CSS, JS, images) from this folder
app.use(express.static(__dirname));

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

// Initialize database (tables) then start server
initDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Chat server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

