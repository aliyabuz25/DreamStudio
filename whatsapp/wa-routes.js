const express = require('express');
const router = express.Router();
const waClient = require('./wa-client');

router.get('/status', (req, res) => {
  res.json(waClient.getStatus());
});

router.post('/connect', (req, res) => {
  waClient.connectToWhatsApp();
  res.json({ success: true, message: 'Bağlantı başlatıldı.' });
});

router.post('/send', async (req, res) => {
  const { phone, message } = req.body;
  try {
    await waClient.sendMessage(phone, message);
    res.json({ success: true, message: 'Mesaj gönderildi.' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
