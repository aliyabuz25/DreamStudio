const express = require('express');
const router = express.Router();
const { User } = require('../models/db');

router.get('/', async (req, res) => {
  // Ensure session structure exists for offcanvas analysis
  if (!req.session.analysisSession) {
    req.session.analysisSession = {
      id: Date.now(),
      images: {},
      currentStep: 1,
      completed: false,
      result: null
    };
  }

  // Fetch true user data from DB
  const user = await User.findByPk(req.session.userId);
  if (!user) return res.redirect('/auth/logout');
  
  const CAMERA_POSITIONS = [
    { id: 1, key: 'front', label: 'Ön Görünüm', icon: 'bi-car-front', description: 'Zorunlu' },
    { id: 2, key: 'rear', label: 'Arka Görünüm', icon: 'bi-car-front-fill', description: 'Zorunlu' },
    { id: 3, key: 'side', label: 'Yan Görünüm', icon: 'bi-camera', description: 'Zorunlu' },
    { id: 4, key: 'interior', label: 'İç Mekan', icon: 'bi-speedometer2', description: 'Opsiyonel' }
  ];

  res.render('index', {
    credits: user.credits || 0,
    userId: user.userNo,
    session: req.session.analysisSession,
    positions: CAMERA_POSITIONS,
    title: 'DreamWork Studio'
  });
});

router.post('/settings', async (req, res) => {
  const { addCredits } = req.body;
  if (addCredits && parseInt(addCredits) > 0) {
    const user = await User.findByPk(req.session.userId);
    if (user) {
      user.credits = (user.credits || 0) + parseInt(addCredits);
      await user.save();
    }
  }
  res.redirect('/');
});

module.exports = router;