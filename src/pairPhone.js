import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  DisconnectReason
} from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const phoneNumber = '8801610594042';
const authDir = path.join(process.cwd(), 'auth_info_baileys');

console.log('Starting stable pairing session for: +' + phoneNumber);

let pairingRequested = false;
let currentSocket = null;

async function startPairing() {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  currentSocket = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    browser: Browsers.windows('Chrome'),
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false
  });

  currentSocket.ev.on('creds.update', saveCreds);

  currentSocket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !currentSocket.authState.creds.registered && !pairingRequested) {
      pairingRequested = true;
      try {
        const code = await currentSocket.requestPairingCode(phoneNumber);
        const formatted = code ? (code.match(/.{1,4}/g) || [code]).join('-') : code;
        console.log('STABLE_PAIRING_CODE:' + formatted);
        fs.writeFileSync('pairing_code.txt', formatted, 'utf8');
      } catch (err) {
        console.error('Pairing code request error:', err.message);
        pairingRequested = false;
      }
    }

    if (connection === 'open') {
      console.log('CONNECTION_OPEN_SUCCESS');
      fs.writeFileSync('paired.flag', 'true', 'utf8');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      console.log('Connection closed, status:', statusCode);
      const isRegistered = currentSocket?.authState?.creds?.registered;
      if (isRegistered) {
        console.log('Already registered. Reconnecting...');
        setTimeout(startPairing, 3000);
      } else {
        pairingRequested = false;
        setTimeout(startPairing, 8000);
      }
    }
  });
}

startPairing();
