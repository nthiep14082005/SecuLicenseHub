const fs = require('node:fs');
const path = require('node:path');

const PREFS_FILE_PATH = path.resolve(__dirname, 'twofa-preferences.json');

function readAllPrefs() {
  try {
    if (!fs.existsSync(PREFS_FILE_PATH)) {
      return {};
    }
    const raw = fs.readFileSync(PREFS_FILE_PATH, 'utf8');
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAllPrefs(allPrefs) {
  fs.mkdirSync(path.dirname(PREFS_FILE_PATH), { recursive: true });
  fs.writeFileSync(PREFS_FILE_PATH, JSON.stringify(allPrefs, null, 2), 'utf8');
}

function getUserTwoFaPrefs(userId, dbIs2faEnabled = false, dbHasTotpSecret = false) {
  const key = String(userId);
  const allPrefs = readAllPrefs();
  const saved = allPrefs[key] || {};

  const totp =
    saved.totp !== undefined
      ? Boolean(saved.totp)
      : Boolean(dbIs2faEnabled && dbHasTotpSecret);
  const gmail = Boolean(saved.gmail);
  const telegram = Boolean(saved.telegram);

  return {
    totp,
    gmail,
    telegram,
    gmailAddress: saved.gmailAddress || '',
    telegramChatId: saved.telegramChatId || ''
  };
}

function updateUserTwoFaPrefs(userId, patch) {
  const key = String(userId);
  const allPrefs = readAllPrefs();
  const current = allPrefs[key] || {
    totp: false,
    gmail: false,
    telegram: false,
    gmailAddress: '',
    telegramChatId: ''
  };

  const next = {
    totp: patch.totp !== undefined ? Boolean(patch.totp) : Boolean(current.totp),
    gmail: patch.gmail !== undefined ? Boolean(patch.gmail) : Boolean(current.gmail),
    telegram: patch.telegram !== undefined ? Boolean(patch.telegram) : Boolean(current.telegram),
    gmailAddress:
      patch.gmailAddress !== undefined
        ? String(patch.gmailAddress || '')
        : String(current.gmailAddress || ''),
    telegramChatId:
      patch.telegramChatId !== undefined
        ? String(patch.telegramChatId || '')
        : String(current.telegramChatId || '')
  };

  allPrefs[key] = next;
  writeAllPrefs(allPrefs);
  return next;
}

function removeUserTwoFaPrefs(userId) {
  const key = String(userId);
  const allPrefs = readAllPrefs();
  if (Object.prototype.hasOwnProperty.call(allPrefs, key)) {
    delete allPrefs[key];
    writeAllPrefs(allPrefs);
  }
}

/**
 * Quy tắc ưu tiên bắt buộc:
 * 1. Bật Google Auth (totp) -> bắt buộc 'totp'
 * 2. Không có totp, bật gmail (+ telegram) -> bắt buộc 'gmail'
 * 3. Chỉ bật telegram -> bắt buộc 'telegram'
 */
function resolveRequired2faMethod(prefs) {
  if (!prefs) return null;
  if (prefs.totp) return 'totp';
  if (prefs.gmail) return 'gmail';
  if (prefs.telegram) return 'telegram';
  return null;
}

module.exports = {
  PREFS_FILE_PATH,
  getUserTwoFaPrefs,
  updateUserTwoFaPrefs,
  removeUserTwoFaPrefs,
  resolveRequired2faMethod
};
