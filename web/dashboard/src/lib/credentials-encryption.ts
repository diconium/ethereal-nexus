/**
 * App-level AES-256-GCM encryption for service account credentials stored in
 * the database.  Even if a DB dump or backup is leaked the credentials are
 * unreadable without the encryption key held only in the server environment.
 *
 * Setup (add to .env.local / production secrets):
 *   SEARCH_CREDENTIALS_ENCRYPTION_KEY=<64 hex chars — 32 random bytes>
 *
 * Generate a key:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Ciphertext format (stored in the database):
 *   enc:v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>
 *
 * Migration / backward compatibility:
 *   Existing plaintext entries (no "enc:v1:" prefix) are decrypted as-is and
 *   a warning is emitted.  Re-save the search app via the dashboard to
 *   encrypt them.  In production we refuse to use unencrypted credentials.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { logger } from '@/lib/logger';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const PREFIX = 'enc:v1:';

// ---------------------------------------------------------------------------
// Key resolution
// ---------------------------------------------------------------------------

function getKey(): Buffer | null {
  const hex = process.env.SEARCH_CREDENTIALS_ENCRYPTION_KEY?.trim();
  if (!hex) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'SEARCH_CREDENTIALS_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (0-9, a-f). ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return Buffer.from(hex, 'hex');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encrypts a plaintext service account JSON string.
 * If SEARCH_CREDENTIALS_ENCRYPTION_KEY is not set the value is stored
 * plaintext (development only) and a warning is logged.
 */
export function encryptCredentials(plaintext: string): string {
  const key = getKey();

  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SEARCH_CREDENTIALS_ENCRYPTION_KEY must be set in production before storing credentials.',
      );
    }
    logger.warn(
      '[security] Storing credentials without encryption. ' +
        'Set SEARCH_CREDENTIALS_ENCRYPTION_KEY in .env.local to encrypt at rest.',
      { operation: 'credentials-encrypt' },
    );
    return plaintext;
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return (
    PREFIX +
    iv.toString('base64') +
    ':' +
    authTag.toString('base64') +
    ':' +
    encrypted.toString('base64')
  );
}

/**
 * Decrypts a previously encrypted credentials string.
 *
 * Legacy plaintext values (no "enc:v1:" prefix) are handled as follows:
 *   - Development: logs a warning and returns the plaintext so existing apps
 *     keep working while the operator re-saves them to trigger encryption.
 *   - Production: throws an error — using unencrypted credentials in production
 *     is refused to enforce the security stance documented at the top of this file.
 */
export function decryptCredentials(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[security] Unencrypted credentials found in database. ' +
          'Re-save this search app via the dashboard to encrypt them before using in production.',
      );
    }
    logger.warn(
      '[security] Unencrypted credentials found in database. ' +
        'Re-save this search app via the dashboard to encrypt them.',
      { operation: 'credentials-decrypt' },
    );
    return stored;
  }

  const key = getKey();
  if (!key) {
    throw new Error(
      'Cannot decrypt credentials: SEARCH_CREDENTIALS_ENCRYPTION_KEY is not configured.',
    );
  }

  // Strip prefix then split into iv:authTag:ciphertext
  const payload = stored.slice(PREFIX.length);
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted credentials value in database.');
  }

  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ctB64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  // Use Buffer.concat so both halves are combined as raw bytes before
  // decoding to UTF-8. Concatenating a Buffer with a string directly
  // relies on implicit coercion and can corrupt multi-byte characters.
  const plainBuffer = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plainBuffer.toString('utf8');
}

/** Returns true when the stored value is in the encrypted format. */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}
