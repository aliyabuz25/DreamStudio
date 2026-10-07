const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());

let sock = null;
let status = 'disconnected';
let latestQR = null;

async function startSocket() {
  const { state, saveCreds } = await useMultiFileAuthState('./admin/auth_info');
  sock = makeWASocket({ 
    auth: state, 
    browser: ['DreamStudio', 'Chrome', '1.0'],
    logger: require('pino')({ level: 'silent' })
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      latestQR = await QRCode.toString(qr, { type: 'svg', width: 250 });
      status = 'qr';
      console.log('QR ready');
    }
    if (connection === 'open') {
      status = 'connected';
      latestQR = null;
      console.log('WhatsApp connected!');
    }
    if (connection === 'close') {
      status = 'disconnected';
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log('Reconnecting...');
        setTimeout(startSocket, 3000);
      } else {
        status = 'loggedout';
        sock = null;
      }
    }
  });
}

app.post('/start', async (req, res) => {
  try {
    if (status === 'connected') return res.json({ status: 'connected', qr: null });
    await startSocket();
    let tries = 0;
    while (!latestQR && tries < 20) { await new Promise(r => setTimeout(r, 500)); tries++; }
    res.json({ status, qr: latestQR });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/status', (req, res) => {
  res.json({ status });
});

app.post('/send', async (req, res) => {
  const { phone, message } = req.body;
  if (!sock || status !== 'connected') return res.status(400).json({ ok: false, error: 'Not connected' });
  try {
    const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    await sock.sendMessage(jid, { text: message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/disconnect', async (req, res) => {
  if (sock) { await sock.logout(); sock = null; }
  status = 'disconnected';
  latestQR = null;
  res.json({ ok: true });
});

app.listen(3001, () => {
  console.log('WA Server running on port 3001');
  // Sunucu başlarken otomatik bağlantı kur
  startSocket().catch(e => console.error('WA Auto-start error:', e.message));
});
