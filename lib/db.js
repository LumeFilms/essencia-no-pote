import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

function seedDB() {
  return {
    config: {
      pixKey: '31995076141',            // ALTERE: sua chave Pix
      pixKeyType: 'telefone',
      merchantName: 'ESSENCIA NO POTE', // máx 25 caracteres, sem acento
      merchantCity: 'BELO HORIZONTE',   // máx 15 caracteres, sem acento
      adminPin: '2108',                 // ALTERE: PIN do painel admin
      whatsapp: '5531995076141'
    },
    flavors: [
      { id: 'f1', name: 'Coco', desc: 'Creme de coco fresco com massa macia', price: 12.0, stock: 20, active: true, emoji: '🥥' },
      { id: 'f2', name: 'Maracujá', desc: 'Creme de maracujá com cobertura especial', price: 12.0, stock: 15, active: true, emoji: '🟡' },
      { id: 'f3', name: 'Brigadeiro', desc: 'Brigadeiro cremoso com chocolate belga', price: 12.0, stock: 20, active: true, emoji: '🍫' },
      { id: 'f4', name: 'Ninho', desc: 'Creme de leite Ninho com massa fofinha', price: 12.0, stock: 18, active: true, emoji: '🍦' },
      { id: 'f5', name: 'Amendoim', desc: 'Creme de amendoim com cobertura crocante', price: 12.0, stock: 12, active: true, emoji: '🥜' }
    ],
    orders: []
  };
}

export function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(seedDB(), null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
export function saveDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
export function newId() { return crypto.randomBytes(4).toString('hex').toUpperCase(); }

/* ---------- Pix (BR Code EMV) ---------- */
function emv(id, value) { return id + String(value.length).padStart(2, '0') + value; }
function crc16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
export function buildPixPayload({ key, name, city, amount, txid }) {
  const merchantAccount = emv('00', 'br.gov.bcb.pix') + emv('01', key);
  let p = emv('00', '01')
        + emv('26', merchantAccount)
        + emv('52', '0000')
        + emv('53', '986')
        + emv('54', amount.toFixed(2))
        + emv('58', 'BR')
        + emv('59', name.substring(0, 25))
        + emv('60', city.substring(0, 15))
        + emv('62', emv('05', txid.substring(0, 25)));
  p += '6304';
  return p + crc16(p);
}

export function isAdmin(req) {
  const db = loadDB();
  return req.headers.get('x-pin') === db.config.adminPin;
}
export const unauthorized = () => Response.json({ error: 'PIN incorreto' }, { status: 401 });
