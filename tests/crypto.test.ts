/**
 * Tests for crypto module
 */
import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  generateSymmetricKey,
  encryptSymmetric,
  decryptSymmetric,
  keyToBase64,
  base64ToKey,
  generatePIN
} from '../src/crypto';

describe('Crypto Module', () => {
  it('should generate a key pair', () => {
    const keyPair = generateKeyPair();
    expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
    expect(keyPair.secretKey).toBeInstanceOf(Uint8Array);
  });

  it('should generate a symmetric key', () => {
    const key = generateSymmetricKey();
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(32); // TweetNaCl secretbox key length
  });

  it('should encrypt and decrypt data symmetrically', () => {
    const key = generateSymmetricKey();
    const message = 'Hello, World!';
    
    const encrypted = encryptSymmetric(message, key);
    expect(encrypted.nonce).toBeDefined();
    expect(encrypted.ciphertext).toBeDefined();
    
    const decrypted = decryptSymmetric(encrypted, key);
    expect(decrypted).toBe(message);
  });

  it('should fail to decrypt with wrong key', () => {
    const key1 = generateSymmetricKey();
    const key2 = generateSymmetricKey();
    const message = 'Secret message';
    
    const encrypted = encryptSymmetric(message, key1);
    const decrypted = decryptSymmetric(encrypted, key2);
    
    expect(decrypted).toBeNull();
  });

  it('should convert key to base64 and back', () => {
    const key = generateSymmetricKey();
    const base64 = keyToBase64(key);
    const restored = base64ToKey(base64);
    
    expect(restored).toEqual(key);
  });

  it('should generate a 6-digit PIN', () => {
    const pin = generatePIN();
    expect(pin).toMatch(/^\d{6}$/);
  });
});
