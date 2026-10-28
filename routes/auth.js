const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models/db');

// Login Page
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('login', { title: 'Giriş Yap', error: null });
});

// Register Page
router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('register', { title: 'Kayıt Ol', error: null });
});

// Login POST
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.render('login', { title: 'Giriş Yap', error: 'Kullanıcı bulunamadı.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', { title: 'Giriş Yap', error: 'Hatalı şifre.' });
    }
    req.session.userId = user.id;
    req.session.userNo = user.userNo;
    req.session.role = user.role;
    
    if (user.role === 'admin') {
      res.redirect('/admin');
    } else {
      res.redirect('/');
    }
  } catch (err) {
    res.render('login', { title: 'Giriş Yap', error: 'Bir hata oluştu.' });
  }
});

// Register POST
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.render('register', { title: 'Kayıt Ol', error: 'Bu e-posta zaten kayıtlı.' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userNo = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6 digit userNo
    
    // İlk kayıt olan kişiyi admin yapalım (Test için)
    const count = await User.count();
    const role = count === 0 ? 'admin' : 'user';

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      userNo,
      role
    });

    req.session.userId = user.id;
    req.session.userNo = user.userNo;
    req.session.role = user.role;
    res.redirect('/');
  } catch (err) {
    res.render('register', { title: 'Kayıt Ol', error: 'Kayıt işlemi başarısız oldu.' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;
