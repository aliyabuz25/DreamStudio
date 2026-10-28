const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const QRCode = require('qrcode');

let sock = null;
let qrCodeDataUrl = null;
let connectionStatus = 'Açık değil';

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth_info_baileys'));

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      connectionStatus = 'QR Bekleniyor';
      qrCodeDataUrl = await QRCode.toDataURL(qr);
    }

    if (connection === 'close') {
      qrCodeDataUrl = null;
      const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
      connectionStatus = 'Bağlantı koptu';
      if (shouldReconnect) {
        connectionStatus = 'Yeniden bağlanılıyor...';
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      qrCodeDataUrl = null;
      connectionStatus = 'Bağlı';
      console.log('WhatsApp Bağlantısı Açıldı');
    }
  });

  sock.ev.on('messages.upsert', async m => {
    // Burada WhatsApp'tan gelen mesajları okuyup işlem yapabilirsiniz (Müşteri destek vs.)
    console.log(JSON.stringify(m, undefined, 2));
  });
}

function getStatus() {
  return { status: connectionStatus, qr: qrCodeDataUrl };
}

function sendMessage(to, text) {
  if (sock && connectionStatus === 'Bağlı') {
    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    return sock.sendMessage(jid, { text });
  }
  return Promise.reject(new Error('WhatsApp bağlı değil'));
}

module.exports = { connectToWhatsApp, getStatus, sendMessage };
