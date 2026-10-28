const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { User } = require('../models/db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Sadece görsel dosyaları kabul edilir'));
  }
});

const CAMERA_POSITIONS = [
  { id: 1, key: 'front', label: 'Ön Görünüm', icon: 'md-arrow-up', description: 'Aracın ön cephesi' },
  { id: 2, key: 'rear', label: 'Arka Görünüm', icon: 'md-arrow-down', description: 'Aracın arka cephesi' },
  { id: 3, key: 'side', label: 'Yan Görünüm', icon: 'md-arrow-back', description: 'Yan taraf profili' },
  { id: 4, key: 'interior', label: 'İç Mekan', icon: 'md-car', description: 'İç mekan ve gösterge paneli' }
];

router.get('/reset', (req, res) => {
  req.session.analysisSession = null;
  // If it's an API/fetch request, return json. Otherwise redirect.
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.json({ success: true });
  }
  res.redirect('/');
});

router.post('/upload/:position', upload.single('image'), async (req, res) => {
  try {
    const { position } = req.params;
    const validPositions = CAMERA_POSITIONS.map(p => p.key);

    if (!validPositions.includes(position)) {
      return res.status(400).json({ success: false, error: 'Geçersiz pozisyon' });
    }

    if (!req.session.analysisSession) {
      req.session.analysisSession = {
        id: Date.now(),
        images: {},
        currentStep: 1,
        completed: false,
        result: null
      };
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Dosya yüklenmedi' });
    }

    req.session.analysisSession.images[position] = {
      filename: req.file.filename,
      path: '/uploads/' + req.file.filename,
      uploadedAt: new Date().toISOString()
    };

    const uploadedCount = Object.keys(req.session.analysisSession.images).length;
    req.session.analysisSession.currentStep = Math.min(uploadedCount + 1, 5);

    res.json({
      success: true,
      position,
      imagePath: '/uploads/' + req.file.filename,
      uploadedCount,
      currentStep: req.session.analysisSession.currentStep
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/run', async (req, res) => {
  try {
    if (!req.session.analysisSession) {
      return res.status(400).json({ success: false, error: 'Analiz oturumu bulunamadı' });
    }

    const images = req.session.analysisSession.images;
    const uploadedCount = Object.keys(images).length;

    if (uploadedCount < 3) {
      return res.status(400).json({ success: false, error: 'En az 3 görsel yükleyin' });
    }

    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Kullanıcı bulunamadı.' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      return res.status(400).json({ success: false, error: 'OpenRouter API key ayarlanmamış' });
    }

    // Build messages with uploaded images
    const imageMessages = [];
    for (const [posKey, imgData] of Object.entries(images)) {
      const pos = CAMERA_POSITIONS.find(p => p.key === posKey);
      const filePath = path.join(__dirname, '../public/uploads', imgData.filename);

      if (fs.existsSync(filePath)) {
        const imageBuffer = fs.readFileSync(filePath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = 'image/jpeg';

        imageMessages.push({
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`
          }
        });
        imageMessages.push({
          type: 'text',
          text: `Yukarıdaki görsel: ${pos ? pos.label : posKey}`
        });
      }
    }

    imageMessages.push({
      type: 'text',
      text: `Bu araç görsellerini analiz et. Lütfen şu bilgileri JSON formatında ver:
{
  "marka": "...",
  "model": "...",
  "yil": "...",
  "renk": "...",
  "govde_tipi": "...",
  "guven_skoru": 85,
  "ozellikler": ["...", "..."],
  "hasar_tespiti": "...",
  "genel_durum": "...",
  "aciklama": "..."
}
Sadece JSON döndür, başka açıklama ekleme.`
    });

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3.2-11b-vision-instruct:free',
        messages: [
          {
            role: 'user',
            content: imageMessages
          }
        ],
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'DreamWork Studio'
        },
        timeout: 60000
      }
    );

    let resultText = response.data.choices[0].message.content;
    let resultData = null;

    try {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      resultData = { aciklama: resultText, marka: 'Tespit edilemedi' };
    }

    req.session.analysisSession.result = resultData;
    req.session.analysisSession.completed = true;

    res.json({
      success: true,
      result: resultData,
      credits: user.credits
    });
  } catch (err) {
    console.error('Analysis error:', err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.response?.data?.error?.message || err.message
    });
  }
});

module.exports = router;
