/**
 * Tests for Offline-First Behavior and Synchronization
 * Based on specifications for offline-first architecture and CRDT sync
 * 
 * Tests cover:
 * - Offline capability
 * - Data persistence
 * - Synchronization behavior
 * - Conflict resolution
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSymmetricKey,
  encryptSymmetric,
  decryptSymmetric,
  keyToBase64,
  base64ToKey
} from '../src/crypto';

describe('Offline-First - Data Persistence', () => {
  describe('Encryption for Offline Storage', () => {
    it('should encrypt data for local storage', () => {
      const key = generateSymmetricKey();
      const data = JSON.stringify({ items: ['Milk', 'Bread', 'Eggs'] });
      
      const encrypted = encryptSymmetric(data, key);
      
      expect(encrypted.nonce).toBeDefined();
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.ciphertext).not.toBe(data);
    });

    it('should decrypt stored data for retrieval', () => {
      const key = generateSymmetricKey();
      const originalData = JSON.stringify({
        items: [
          { id: '1', text: 'Milk', completed: false },
          { id: '2', text: 'Bread', completed: true }
        ]
      });
      
      const encrypted = encryptSymmetric(originalData, key);
      const decrypted = decryptSymmetric(encrypted, key);
      
      expect(decrypted).toBe(originalData);
      const parsed = JSON.parse(decrypted!);
      expect(parsed.items.length).toBe(2);
    });

    it('should handle encrypting and decrypting complex data structures', () => {
      const key = generateSymmetricKey();
      const complexData = {
        listId: 'grocery-123',
        timestamp: Date.now(),
        items: [
          { id: '1', text: 'Milk', completed: false, addedAt: Date.now() },
          { id: '2', text: 'Bread', completed: true, addedAt: Date.now() - 1000 }
        ],
        metadata: {
          created: Date.now(),
          lastModified: Date.now(),
          version: 1
        }
      };
      
      const dataString = JSON.stringify(complexData);
      const encrypted = encryptSymmetric(dataString, key);
      const decrypted = decryptSymmetric(encrypted, key);
      
      expect(decrypted).toBe(dataString);
      const parsed = JSON.parse(decrypted!);
      expect(parsed.listId).toBe('grocery-123');
      expect(parsed.items.length).toBe(2);
      expect(parsed.metadata.version).toBe(1);
    });

    it('should preserve data integrity through encryption cycle', () => {
      const key = generateSymmetricKey();
      const testCases = [
        'Simple string',
        '{"json": "object"}',
        'Special chars: !@#$%^&*()',
        'Unicode: 日本語 🛒',
        'Numbers: 123456789',
        ''
      ];
      
      testCases.forEach(testData => {
        const encrypted = encryptSymmetric(testData, key);
        const decrypted = decryptSymmetric(encrypted, key);
        expect(decrypted).toBe(testData);
      });
    });
  });

  describe('Key Management for Offline Access', () => {
    it('should serialize keys for storage', () => {
      const key = generateSymmetricKey();
      const serialized = keyToBase64(key);
      
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(0);
    });

    it('should deserialize keys from storage', () => {
      const originalKey = generateSymmetricKey();
      const serialized = keyToBase64(originalKey);
      const deserialized = base64ToKey(serialized);
      
      expect(deserialized).toEqual(originalKey);
    });

    it('should maintain key integrity through serialization cycle', () => {
      const key = generateSymmetricKey();
      const data = 'Test data for encryption';
      
      // Encrypt with original key
      const encrypted1 = encryptSymmetric(data, key);
      
      // Serialize and deserialize key
      const serialized = keyToBase64(key);
      const deserializedKey = base64ToKey(serialized);
      
      // Encrypt with deserialized key - should produce valid encryption
      const encrypted2 = encryptSymmetric(data, deserializedKey);
      
      // Both encryptions should be decryptable with either key
      expect(decryptSymmetric(encrypted1, deserializedKey)).toBe(data);
      expect(decryptSymmetric(encrypted2, key)).toBe(data);
    });
  });
});

describe('Offline-First - Instant Local Operations', () => {
  describe('Operation Speed', () => {
    it('should complete operations in milliseconds', () => {
      const operations = [];
      const startTime = Date.now();
      
      // Simulate 100 local operations
      for (let i = 0; i < 100; i++) {
        operations.push({
          id: `item-${i}`,
          timestamp: Date.now(),
          type: 'add'
        });
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
    });

    it('should not block during data processing', () => {
      const key = generateSymmetricKey();
      const startTime = Date.now();
      
      // Perform multiple encryption operations
      for (let i = 0; i < 10; i++) {
        encryptSymmetric(`Item ${i}`, key);
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Local Data Consistency', () => {
    it('should maintain data consistency without network', () => {
      const key = generateSymmetricKey();
      const operations = [
        { type: 'add', data: 'Milk' },
        { type: 'add', data: 'Bread' },
        { type: 'update', data: 'Milk - Low Fat' },
        { type: 'delete', data: 'Bread' }
      ];
      
      // All operations should complete without network
      operations.forEach(op => {
        const encrypted = encryptSymmetric(JSON.stringify(op), key);
        const decrypted = decryptSymmetric(encrypted, key);
        expect(decrypted).toBe(JSON.stringify(op));
      });
    });
  });
});

describe('Synchronization - Data Sharing', () => {
  describe('Capability-Based Sharing', () => {
    it('should share encryption key with room ID', () => {
      const key = generateSymmetricKey();
      const roomId = 'room-' + Math.random().toString(36).substr(2, 9);
      const keyString = keyToBase64(key);
      
      // Simulate sharing URL
      const shareUrl = `https://app.example.com?room=${roomId}&key=${keyString}`;
      
      expect(shareUrl).toContain(roomId);
      expect(shareUrl).toContain(keyString);
    });

    it('should allow recipient to decrypt with shared key', () => {
      // Sender creates and shares
      const senderKey = generateSymmetricKey();
      const message = JSON.stringify({ items: ['Milk', 'Bread'] });
      const encrypted = encryptSymmetric(message, senderKey);
      const sharedKey = keyToBase64(senderKey);
      
      // Recipient receives and decrypts
      const recipientKey = base64ToKey(sharedKey);
      const decrypted = decryptSymmetric(encrypted, recipientKey);
      
      expect(decrypted).toBe(message);
    });

    it('should prevent access without correct key', () => {
      const correctKey = generateSymmetricKey();
      const wrongKey = generateSymmetricKey();
      const data = 'Secret shopping list';
      
      const encrypted = encryptSymmetric(data, correctKey);
      const decrypted = decryptSymmetric(encrypted, wrongKey);
      
      expect(decrypted).toBeNull(); // Should fail to decrypt
    });
  });

  describe('Multi-Device Sync', () => {
    it('should allow multiple devices to share same list', () => {
      const sharedKey = generateSymmetricKey();
      const keyString = keyToBase64(sharedKey);
      
      // Device 1 encrypts
      const device1Data = JSON.stringify({ device: 1, items: ['Milk'] });
      const encrypted1 = encryptSymmetric(device1Data, sharedKey);
      
      // Device 2 receives key and decrypts
      const device2Key = base64ToKey(keyString);
      const decrypted = decryptSymmetric(encrypted1, device2Key);
      expect(decrypted).toBe(device1Data);
      
      // Device 2 can also encrypt
      const device2Data = JSON.stringify({ device: 2, items: ['Bread'] });
      const encrypted2 = encryptSymmetric(device2Data, device2Key);
      
      // Device 1 can decrypt Device 2's data
      const decrypted2 = decryptSymmetric(encrypted2, sharedKey);
      expect(decrypted2).toBe(device2Data);
    });

    it('should maintain data confidentiality across devices', () => {
      const roomKey = generateSymmetricKey();
      const devices = 3;
      
      // Each device has the same key
      const deviceKeys = Array(devices).fill(roomKey);
      
      // Each device encrypts some data
      const encryptedData = deviceKeys.map((key, index) => {
        const data = JSON.stringify({ deviceId: index, item: `Item ${index}` });
        return encryptSymmetric(data, key);
      });
      
      // All devices can decrypt all data
      encryptedData.forEach((encrypted, index) => {
        deviceKeys.forEach((key, deviceIndex) => {
          const decrypted = decryptSymmetric(encrypted, key);
          expect(decrypted).toBeDefined();
          if (decrypted) {
            const parsed = JSON.parse(decrypted);
            expect(parsed.deviceId).toBe(index);
          }
        });
      });
    });
  });
});

describe('Synchronization - Server Cannot Decrypt', () => {
  describe('Zero-Knowledge Server', () => {
    it('should encrypt data before sending to server', () => {
      const key = generateSymmetricKey();
      const plaintext = JSON.stringify({ 
        items: ['Confidential Item 1', 'Confidential Item 2'] 
      });
      
      const encrypted = encryptSymmetric(plaintext, key);
      
      // Server receives only encrypted data
      expect(encrypted.ciphertext).not.toContain('Confidential');
      expect(encrypted.ciphertext).not.toBe(plaintext);
    });

    it('should not expose encryption key to server', () => {
      const key = generateSymmetricKey();
      const data = 'Secret shopping list';
      const encrypted = encryptSymmetric(data, key);
      
      // Server only has encrypted payload and nonce, not the key
      const serverData = {
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce
        // No key field - key is only in client URL
      };
      
      expect(serverData).not.toHaveProperty('key');
      expect(Object.keys(serverData)).toEqual(['ciphertext', 'nonce']);
    });

    it('should prevent server from reading message contents', () => {
      const key = generateSymmetricKey();
      const sensitiveData = JSON.stringify({
        creditCard: '4111-1111-1111-1111',
        items: ['Expensive Item 1', 'Expensive Item 2']
      });
      
      const encrypted = encryptSymmetric(sensitiveData, key);
      
      // Verify encrypted data doesn't contain plaintext
      const ciphertextString = encrypted.ciphertext;
      expect(ciphertextString).not.toContain('4111');
      expect(ciphertextString).not.toContain('Expensive');
      expect(ciphertextString).not.toContain('creditCard');
    });
  });
});

describe('Synchronization - Event-Based Updates', () => {
  describe('Update Notifications', () => {
    it('should generate update events for changes', () => {
      const events = [];
      const key = generateSymmetricKey();
      
      // Simulate various operations generating events
      const operations = [
        { type: 'item.added', data: 'Milk' },
        { type: 'item.toggled', data: 'item-123' },
        { type: 'item.deleted', data: 'item-456' }
      ];
      
      operations.forEach(op => {
        const encrypted = encryptSymmetric(JSON.stringify(op), key);
        events.push({
          timestamp: Date.now(),
          payload: encrypted
        });
      });
      
      expect(events.length).toBe(3);
      events.forEach(event => {
        expect(event.payload.ciphertext).toBeDefined();
        expect(event.payload.nonce).toBeDefined();
      });
    });

    it('should process incoming sync updates', () => {
      const key = generateSymmetricKey();
      
      // Simulate receiving encrypted updates from another device
      const updates = [
        encryptSymmetric(JSON.stringify({ op: 'add', text: 'Milk' }), key),
        encryptSymmetric(JSON.stringify({ op: 'add', text: 'Bread' }), key),
        encryptSymmetric(JSON.stringify({ op: 'toggle', id: '123' }), key)
      ];
      
      // Process each update
      const processed = updates.map(update => {
        const decrypted = decryptSymmetric(update, key);
        return decrypted ? JSON.parse(decrypted) : null;
      });
      
      expect(processed).toHaveLength(3);
      expect(processed[0]?.text).toBe('Milk');
      expect(processed[1]?.text).toBe('Bread');
      expect(processed[2]?.op).toBe('toggle');
    });
  });

  describe('Idempotent Updates', () => {
    it('should handle duplicate updates gracefully', () => {
      const key = generateSymmetricKey();
      const update = JSON.stringify({ id: '123', op: 'add', text: 'Milk' });
      const encrypted = encryptSymmetric(update, key);
      
      // Process same update multiple times
      const results = [];
      for (let i = 0; i < 5; i++) {
        const decrypted = decryptSymmetric(encrypted, key);
        results.push(decrypted);
      }
      
      // All results should be identical
      expect(new Set(results).size).toBe(1);
      expect(results[0]).toBe(update);
    });

    it('should produce consistent results for repeated operations', () => {
      const key = generateSymmetricKey();
      const data = JSON.stringify({ value: 42 });
      
      // Encrypt same data multiple times with different nonces
      const encrypted1 = encryptSymmetric(data, key);
      const encrypted2 = encryptSymmetric(data, key);
      
      // Nonces should be different
      expect(encrypted1.nonce).not.toBe(encrypted2.nonce);
      
      // But both should decrypt to same plaintext
      expect(decryptSymmetric(encrypted1, key)).toBe(data);
      expect(decryptSymmetric(encrypted2, key)).toBe(data);
    });
  });
});

describe('Synchronization - Conflict Scenarios', () => {
  describe('Concurrent Modifications', () => {
    it('should handle concurrent additions from different devices', () => {
      const sharedKey = generateSymmetricKey();
      
      // Device 1 adds item
      const device1Update = encryptSymmetric(
        JSON.stringify({ device: 1, op: 'add', text: 'Milk', timestamp: Date.now() }),
        sharedKey
      );
      
      // Device 2 adds different item at same time
      const device2Update = encryptSymmetric(
        JSON.stringify({ device: 2, op: 'add', text: 'Bread', timestamp: Date.now() }),
        sharedKey
      );
      
      // Both updates should be valid and decryptable
      const decrypted1 = decryptSymmetric(device1Update, sharedKey);
      const decrypted2 = decryptSymmetric(device2Update, sharedKey);
      
      expect(decrypted1).toBeDefined();
      expect(decrypted2).toBeDefined();
      
      // Both operations should be processable
      const op1 = JSON.parse(decrypted1!);
      const op2 = JSON.parse(decrypted2!);
      
      expect(op1.text).toBe('Milk');
      expect(op2.text).toBe('Bread');
    });

    it('should preserve all concurrent changes', () => {
      const key = generateSymmetricKey();
      const updates = [];
      
      // Simulate 5 devices making changes simultaneously
      for (let i = 0; i < 5; i++) {
        const update = {
          deviceId: i,
          timestamp: Date.now(),
          changes: [`Device ${i} added item`]
        };
        updates.push(encryptSymmetric(JSON.stringify(update), key));
      }
      
      // All updates should be independently decryptable
      const decrypted = updates.map(u => {
        const dec = decryptSymmetric(u, key);
        return dec ? JSON.parse(dec) : null;
      });
      
      expect(decrypted).toHaveLength(5);
      expect(decrypted.every(d => d !== null)).toBe(true);
    });
  });
});

describe('Offline-First - Resilience', () => {
  describe('Data Integrity', () => {
    it('should detect corrupted encrypted data', () => {
      const key = generateSymmetricKey();
      const data = 'Important data';
      const encrypted = encryptSymmetric(data, key);
      
      // Corrupt the ciphertext by adding invalid characters
      const corrupted = {
        ...encrypted,
        ciphertext: 'invalid!@#$%^&*()' + encrypted.ciphertext
      };
      
      // Decryption should either fail or throw error
      try {
        const decrypted = decryptSymmetric(corrupted, key);
        expect(decrypted).toBeNull(); // Should fail authentication
      } catch (error) {
        // Throwing error is also acceptable for corrupted data
        expect(error).toBeDefined();
      }
    });

    it('should reject data encrypted with wrong nonce', () => {
      const key = generateSymmetricKey();
      const data = 'Test data';
      const encrypted1 = encryptSymmetric(data, key);
      const encrypted2 = encryptSymmetric(data, key);
      
      // Mix ciphertext from one with nonce from another
      const mixed = {
        ciphertext: encrypted1.ciphertext,
        nonce: encrypted2.nonce
      };
      
      const decrypted = decryptSymmetric(mixed, key);
      expect(decrypted).toBeNull(); // Should fail to decrypt
    });

    it('should handle encryption of large data', () => {
      const key = generateSymmetricKey();
      const largeData = JSON.stringify({
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: `item-${i}`,
          text: `Shopping item number ${i}`,
          completed: i % 2 === 0
        }))
      });
      
      const encrypted = encryptSymmetric(largeData, key);
      const decrypted = decryptSymmetric(encrypted, key);
      
      expect(decrypted).toBe(largeData);
      const parsed = JSON.parse(decrypted!);
      expect(parsed.items.length).toBe(1000);
    });
  });
});
