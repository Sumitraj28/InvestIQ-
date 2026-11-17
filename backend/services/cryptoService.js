const crypto = require('crypto');

// 256-bit encryption key derivation from process.env or deterministic master fallback
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended 96 bits for GCM
const TAG_LENGTH = 16;

function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_KEY || 'investiq-phase4-secure-broker-key-32b!';
  // Hash to exactly 32 bytes (256 bits)
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Encrypt plaintext string using AES-256-GCM
 * Output format: base64(iv):base64(authTag):base64(ciphertext)
 */
function encrypt(plaintext) {
  if (!plaintext) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  let encrypted = cipher.update(String(plaintext), 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt string previously encrypted with AES-256-GCM
 */
function decrypt(encryptedPayload) {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') return null;
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const [ivB64, tagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertextB64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate cryptographically secure random anti-CSRF state token
 */
function generateStateToken(userId, brokerId) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const payload = `${userId}:${brokerId}:${timestamp}:${nonce}`;
  const hmac = crypto.createHmac('sha256', getEncryptionKey()).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

/**
 * Verify anti-CSRF state token and ensure it is valid, unexpired, and matches user/broker
 */
function verifyStateToken(stateToken, expectedUserId, expectedBrokerId, maxAgeMs = 15 * 60 * 1000) {
  if (!stateToken || typeof stateToken !== 'string') return false;
  try {
    const raw = Buffer.from(stateToken, 'base64url').toString('utf8');
    const parts = raw.split(':');
    if (parts.length !== 5) return false;

    const [userId, brokerId, timestampStr, nonce, receivedHmac] = parts;
    if (userId !== expectedUserId || brokerId !== expectedBrokerId) return false;

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || Date.now() - timestamp > maxAgeMs) return false;

    const payload = `${userId}:${brokerId}:${timestampStr}:${nonce}`;
    const expectedHmac = crypto.createHmac('sha256', getEncryptionKey()).update(payload).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(receivedHmac), Buffer.from(expectedHmac));
  } catch (err) {
    return false;
  }
}

/**
 * Redact sensitive fields from any object for safe logging & responses
 */
function redactSecrets(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sensitiveKeys = [
    'accesstoken',
    'refreshtoken',
    'encryptedaccesstoken',
    'encryptedrefreshtoken',
    'apisecret',
    'clientsecret',
    'password',
    'pin',
    'totp',
    'otp',
    'secret',
  ];

  const clean = Array.isArray(obj) ? [] : {};
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
      clean[key] = '•••REDACTED•••';
    } else if (val && typeof val === 'object') {
      clean[key] = redactSecrets(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

module.exports = {
  encrypt,
  decrypt,
  generateStateToken,
  verifyStateToken,
  redactSecrets,
};
