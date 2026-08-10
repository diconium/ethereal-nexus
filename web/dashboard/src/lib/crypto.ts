/**
 * Symmetric encryption for secrets at rest (e.g. CMS connection credentials).
 *
 * Uses AES-256-GCM. The key is derived from the `CMS_CONNECTOR_ENCRYPTION_KEY`
 * environment variable (32 bytes, provided as base64 or a passphrase that we
 * hash to 32 bytes with SHA-256).
 *
 * Ciphertext format (base64):  iv(12) | authTag(16) | ciphertext
 *
 * Server-only. Do not import from client components.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended for GCM
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.CMS_CONNECTOR_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      'CMS_CONNECTOR_ENCRYPTION_KEY is not set. Cannot encrypt/decrypt connection secrets.',
    );
  }
  // Try base64 32-byte key first; otherwise derive a 32-byte key via SHA-256.
  const asBase64 = Buffer.from(secret, 'base64');
  if (asBase64.length === 32) {
    return asBase64;
  }
  return createHash('sha256').update(secret, 'utf8').digest();
}

/** Encrypt a UTF-8 string, returning a base64 blob. */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/** Decrypt a base64 blob produced by `encrypt`, returning the UTF-8 string. */
export function decrypt(payload: string): string {
  const key = getKey();
  const data = Buffer.from(payload, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

/** Encrypt a JSON-serializable object. */
export function encryptJson(value: unknown): string {
  return encrypt(JSON.stringify(value));
}

/** Decrypt to an object of type T (caller should validate the shape). */
export function decryptJson<T = unknown>(payload: string): T {
  return JSON.parse(decrypt(payload)) as T;
}
