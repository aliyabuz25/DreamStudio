require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { sequelize } = require('./models/db');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dreamwork_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Init DB
sequelize.sync().then(() => {
  console.log('Veritabanı (SQLite) senkronize edildi.');
});

// Authentication Middleware
const authMiddleware = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
};

const adminMiddleware = (req, res, next) => {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.redirect('/');
  }
  next();
};

// Routes
const authRouter = require('./routes/auth');
const indexRouter = require('./routes/index');
const analyzeRouter = require('./routes/analyze');
const adminRouter = require('./routes/admin');
const waRouter = require('./whatsapp/wa-routes');

app.use('/auth', authRouter);
app.use('/', authMiddleware, indexRouter);
app.use('/analyze', authMiddleware, analyzeRouter);
app.use('/admin', adminMiddleware, adminRouter);
app.use('/wa', adminMiddleware, waRouter);

app.listen(PORT, () => {
  console.log(`DreamWork Studio running on http://localhost:${PORT}`);
});