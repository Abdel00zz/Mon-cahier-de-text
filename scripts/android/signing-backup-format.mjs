import crypto from 'node:crypto';

const format = 'cahier-upload-key-v1';
const kdf = 'scrypt-N32768-r8-p1';
const cipher = 'aes-256-gcm';
const deriveKey = (password, salt) => crypto.scryptSync(password, salt, 32, { N: 32768, maxmem: 64 * 1024 * 1024 });
const authenticationError = 'Backup authentication failed. Check the private passphrase and backup integrity. No key was imported.';

function validatePayload(value) {
  if (!value || typeof value.alias !== 'string' || !value.alias || typeof value.store !== 'string' ||
      !value.store || typeof value.storePassword !== 'string' || !value.storePassword ||
      value.storePassword !== value.keyPassword) throw new Error('Invalid upload-key recovery payload.');
  const bytes = Buffer.from(value.store, 'base64');
  if (!bytes.length || bytes.toString('base64') !== value.store) throw new Error('Invalid PKCS12 encoding.');
  return value;
}

export function encryptSigningBackup(payload, password) {
  if (typeof password !== 'string' || password.length < 16) throw new Error('Use a private backup passphrase of at least 16 characters.');
  validatePayload(payload);
  const salt = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const encoder = crypto.createCipheriv(cipher, deriveKey(password, salt), iv);
  const data = Buffer.concat([encoder.update(JSON.stringify(payload), 'utf8'), encoder.final()]);
  return { format, kdf, cipher, salt: salt.toString('base64'), iv: iv.toString('base64'),
    tag: encoder.getAuthTag().toString('base64'), data: data.toString('base64') };
}

export function decryptSigningBackup(backup, password) {
  try {
    if (!backup || backup.format !== format || backup.kdf !== kdf || backup.cipher !== cipher ||
        typeof password !== 'string' || password.length < 16 || typeof backup.data !== 'string' ||
        !backup.data.length || backup.data.length > 2_000_000) throw new Error();
    const salt = Buffer.from(backup.salt, 'base64');
    const iv = Buffer.from(backup.iv, 'base64');
    const tag = Buffer.from(backup.tag, 'base64');
    if (salt.length !== 32 || iv.length !== 12 || tag.length !== 16) throw new Error();
    const decoder = crypto.createDecipheriv(cipher, deriveKey(password, salt), iv);
    decoder.setAuthTag(tag);
    const plaintext = Buffer.concat([decoder.update(Buffer.from(backup.data, 'base64')), decoder.final()]);
    return validatePayload(JSON.parse(plaintext.toString('utf8')));
  } catch { throw new Error(authenticationError); }
}
