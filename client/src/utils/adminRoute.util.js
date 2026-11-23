export const ADMIN_ROUTE_TOKEN_KEY = 'slh_admin_route_token';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const URL_SAFE_SPECIALS = '-_~!@$&*+';
const ALL_RANDOM_CHARS = LETTERS + DIGITS + URL_SAFE_SPECIALS;
const VALID_SUFFIX_REGEX = /^[A-Za-z0-9\-_~!@$&*+]{10}$/;

function randomInt(max) {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function pickRandomChar(charset) {
  return charset[randomInt(charset.length)];
}

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Tạo tiền tố mã hóa từ tên Gmail:
 * 1) Lấy phần trước '@', chuẩn hóa chữ thường và đảo ngược chuỗi
 * 2) Chuyển từng ký tự sang mã số Unicode (charCodeAt(0)) và nối liền
 * 3) Nối thêm chuỗi cố định '1234'
 */
export function buildAdminSecretPrefix(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const localPart = cleanEmail.split('@')[0] || '';
  if (!localPart) return '';

  const reversed = localPart.split('').reverse().join('');
  let unicodeChain = '';
  for (let i = 0; i < reversed.length; i += 1) {
    unicodeChain += String(reversed.charCodeAt(i));
  }
  return `${unicodeChain}1234`;
}

/**
 * Sinh segment đường dẫn Admin bí mật:
 * <unicode_dao_nguoc_ten_gmail>1234<10_ky_tu_ngau_nhien_an_toan_URL>
 */
export function generateAdminSecretSegment(email) {
  const prefix = buildAdminSecretPrefix(email);
  if (!prefix) return '';

  // Đảm bảo có đủ chữ cái, chữ số và ký tự đặc biệt an toàn URL trong 10 ký tự ngẫu nhiên
  const chars = [
    pickRandomChar(LETTERS),
    pickRandomChar(DIGITS),
    pickRandomChar(URL_SAFE_SPECIALS)
  ];
  for (let i = 3; i < 10; i += 1) {
    chars.push(pickRandomChar(ALL_RANDOM_CHARS));
  }

  const randomSuffix = shuffleArray(chars).join('');
  return `${prefix}${randomSuffix}`;
}

export function getOrCreateAdminSecretSegment(email) {
  if (!email) return '';
  if (typeof sessionStorage === 'undefined') {
    return generateAdminSecretSegment(email);
  }

  try {
    const existing = sessionStorage.getItem(ADMIN_ROUTE_TOKEN_KEY);
    const prefix = buildAdminSecretPrefix(email);
    if (
      existing &&
      prefix &&
      existing.startsWith(prefix) &&
      existing.length === prefix.length + 10 &&
      VALID_SUFFIX_REGEX.test(existing.slice(prefix.length))
    ) {
      return existing;
    }

    const created = generateAdminSecretSegment(email);
    if (created) {
      sessionStorage.setItem(ADMIN_ROUTE_TOKEN_KEY, created);
    }
    return created;
  } catch {
    return generateAdminSecretSegment(email);
  }
}

export function getAdminBasePath(email) {
  const segment = getOrCreateAdminSecretSegment(email);
  return `/admin/admin/${segment}`;
}

export function resetAdminSecretSegmentForEmail(email) {
  clearAdminSecretSegment();
  return getAdminBasePath(email);
}

export function clearAdminSecretSegment() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(ADMIN_ROUTE_TOKEN_KEY);
  } catch {
    // Bỏ qua lỗi storage
  }
}

/**
 * Kiểm tra segment đường dẫn Admin:
 * - Bắt đầu đúng bằng <unicodeDaoNguocTenGmail>1234 và có đúng 10 ký tự an toàn URL phía sau
 * - Trong phiên trình duyệt, phải khớp đúng token lưu tại sessionStorage ('slh_admin_route_token')
 */
export function isValidAdminSecretSegment(segment, email) {
  if (!segment || typeof segment !== 'string' || !email) return false;

  const prefix = buildAdminSecretPrefix(email);
  if (!prefix) return false;

  if (!segment.startsWith(prefix) || segment.length !== prefix.length + 10) {
    return false;
  }

  const suffix = segment.slice(prefix.length);
  if (!VALID_SUFFIX_REGEX.test(suffix)) {
    return false;
  }

  if (typeof sessionStorage !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(ADMIN_ROUTE_TOKEN_KEY);
      if (!stored || stored !== segment) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}
