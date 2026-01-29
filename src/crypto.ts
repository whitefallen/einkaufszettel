/**
 * Encryption module using TweetNaCl for end-to-end encryption
 * All data stored and transmitted is encrypted
 */
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

export interface EncryptedData {
  nonce: string;
  ciphertext: string;
}

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/**
 * Generate a new key pair for encryption
 */
export function generateKeyPair(): KeyPair {
  return nacl.box.keyPair();
}

/**
 * Generate a random symmetric key
 */
export function generateSymmetricKey(): Uint8Array {
  return nacl.randomBytes(nacl.secretbox.keyLength);
}

/**
 * Encrypt data with a symmetric key
 */
export function encryptSymmetric(data: string, key: Uint8Array): EncryptedData {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const messageUint8 = encodeUTF8(data);
  const ciphertext = nacl.secretbox(messageUint8, nonce, key);
  
  return {
    nonce: encodeBase64(nonce),
    ciphertext: encodeBase64(ciphertext)
  };
}

/**
 * Decrypt data with a symmetric key
 */
export function decryptSymmetric(encrypted: EncryptedData, key: Uint8Array): string | null {
  const nonce = decodeBase64(encrypted.nonce);
  const ciphertext = decodeBase64(encrypted.ciphertext);
  const decrypted = nacl.secretbox.open(ciphertext, nonce, key);
  
  if (!decrypted) {
    return null;
  }
  
  return decodeUTF8(decrypted);
}

/**
 * Encrypt data for a specific recipient using public key encryption
 */
export function encryptAsymmetric(
  data: string,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): EncryptedData {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = encodeUTF8(data);
  const ciphertext = nacl.box(messageUint8, nonce, recipientPublicKey, senderSecretKey);
  
  return {
    nonce: encodeBase64(nonce),
    ciphertext: encodeBase64(ciphertext)
  };
}

/**
 * Decrypt asymmetrically encrypted data
 */
export function decryptAsymmetric(
  encrypted: EncryptedData,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): string | null {
  const nonce = decodeBase64(encrypted.nonce);
  const ciphertext = decodeBase64(encrypted.ciphertext);
  const decrypted = nacl.box.open(ciphertext, nonce, senderPublicKey, recipientSecretKey);
  
  if (!decrypted) {
    return null;
  }
  
  return decodeUTF8(decrypted);
}

/**
 * Convert key to base64 for storage/transmission
 */
export function keyToBase64(key: Uint8Array): string {
  return encodeBase64(key);
}

/**
 * Convert base64 string back to key
 */
export function base64ToKey(encoded: string): Uint8Array {
  return decodeBase64(encoded);
}

/**
 * Generate a random PIN for sharing
 */
export function generatePIN(): string {
  const digits = '0123456789';
  let pin = '';
  const randomBytes = nacl.randomBytes(6);
  
  for (let i = 0; i < 6; i++) {
    pin += digits[randomBytes[i] % 10];
  }
  
  return pin;
}

/**
 * Derive a key from a PIN using a simple KDF
 * Note: This is a simplified approach. In production, use a proper KDF like PBKDF2
 */
export function deriveKeyFromPIN(pin: string, salt: Uint8Array): Uint8Array {
  // Simple hash-based derivation (for demonstration)
  const combined = encodeUTF8(pin + encodeBase64(salt));
  return nacl.hash(combined).slice(0, nacl.secretbox.keyLength);
}
