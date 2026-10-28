const express = require('express');
const router = express.Router();
const { User, Setting } = require('../models/db');
const path = require('path');

router.get('/', async (req, res) => {
  const usersCount = await User.count();
  const users = await User.findAll({ limit: 10, order: [['createdAt', 'DESC']] });
  
  res.render('admin/dashboard', {
    title: 'AdminLTE',
    user: req.session,
    usersCount,
    users
  });
});

router.get('/users', async (req, res) => {
  const users = await User.findAll();
  res.render('admin/users', { title: 'Kullanıcılar', user: req.session, users });
});

router.post('/users/:id/credits', async (req, res) => {
  const { credits } = req.body;
  const user = await User.findByPk(req.params.id);
  if (user) {
    user.credits = (user.credits || 0) + parseInt(credits);
    await user.save();
  }
  res.redirect('/admin/users');
});

router.get('/settings', async (req, res) => {
  const settingsList = await Setting.findAll();
  const settings = {};
  settingsList.forEach(s => settings[s.key] = s.value);
  res.render('admin/settings', { title: 'Ayarlar (WP Baileys)', user: req.session, settings });
});

module.exports = router;