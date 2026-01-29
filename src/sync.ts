/**
 * Network synchronization module
 * Event-based sync with encrypted payloads to relay server
 */
import { getStateManager } from './state';
import { encryptSymmetric, decryptSymmetric, generateSymmetricKey, keyToBase64, base64ToKey } from './crypto';
import { getMetadata, setMetadata } from './storage';

export type SyncStatus = 'offline' | 'syncing' | 'synced';

/**
 * Sync manager handles network synchronization
 */
export class SyncManager {
  private ws: WebSocket | null = null;
  private status: SyncStatus = 'offline';
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private roomKey: Uint8Array | null = null;
  private roomId: string | null = null;
  private reconnectTimeout: number | null = null;
  private serverUrl: string;
  
  constructor(serverUrl = 'ws://localhost:3000') {
    this.serverUrl = serverUrl;
  }
  
  /**
   * Initialize sync with a room
   */
  async init(roomId?: string, roomKey?: Uint8Array): Promise<void> {
    // Get or create room credentials
    if (roomId && roomKey) {
      this.roomId = roomId;
      this.roomKey = roomKey;
      await setMetadata('roomId', roomId);
      await setMetadata('roomKey', keyToBase64(roomKey));
    } else {
      // Try to restore from storage
      const storedRoomId = await getMetadata('roomId');
      const storedRoomKey = await getMetadata('roomKey');
      
      if (storedRoomId && storedRoomKey) {
        this.roomId = storedRoomId;
        this.roomKey = base64ToKey(storedRoomKey);
      } else {
        // Create new room
        this.roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        this.roomKey = generateSymmetricKey();
        await setMetadata('roomId', this.roomId);
        await setMetadata('roomKey', keyToBase64(this.roomKey));
      }
    }
    
    this.connect();
  }
  
  /**
   * Connect to the relay server
   */
  private connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    
    try {
      this.ws = new WebSocket(this.serverUrl);
      
      this.ws.onopen = () => {
        console.log('Connected to sync server');
        this.updateStatus('synced');
        
        // Join room
        if (this.roomId) {
          this.send({
            type: 'join',
            roomId: this.roomId
          });
          
          // Send current state
          this.syncState();
        }
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateStatus('offline');
      };
      
      this.ws.onclose = () => {
        console.log('Disconnected from sync server');
        this.updateStatus('offline');
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('Failed to connect:', error);
      this.updateStatus('offline');
      this.scheduleReconnect();
    }
  }
  
  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 5000);
  }
  
  /**
   * Send message to server
   */
  private send(message: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
  
  /**
   * Handle incoming message
   */
  private async handleMessage(data: string): Promise<void> {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'update' && message.payload && this.roomKey) {
        // Decrypt and apply update
        const decrypted = decryptSymmetric(message.payload, this.roomKey);
        if (decrypted) {
          const update = Uint8Array.from(atob(decrypted), c => c.charCodeAt(0));
          getStateManager().applyUpdate(update);
        }
      }
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  }
  
  /**
   * Sync current state to server
   */
  async syncState(): Promise<void> {
    if (!this.roomKey || !this.roomId) return;
    
    this.updateStatus('syncing');
    
    try {
      const state = getStateManager();
      const update = state.getStateUpdate();
      
      // Encrypt update
      const base64Update = btoa(String.fromCharCode(...update));
      const encrypted = encryptSymmetric(base64Update, this.roomKey);
      
      this.send({
        type: 'update',
        roomId: this.roomId,
        payload: encrypted
      });
      
      this.updateStatus('synced');
    } catch (error) {
      console.error('Failed to sync state:', error);
      this.updateStatus('offline');
    }
  }
  
  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return this.status;
  }
  
  /**
   * Subscribe to status changes
   */
  onStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Update sync status
   */
  private updateStatus(status: SyncStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.listeners.forEach(listener => listener(status));
    }
  }
  
  /**
   * Get current room credentials for sharing
   */
  getRoomCredentials(): { roomId: string; roomKey: string } | null {
    if (!this.roomId || !this.roomKey) return null;
    
    return {
      roomId: this.roomId,
      roomKey: keyToBase64(this.roomKey)
    };
  }
  
  /**
   * Disconnect from sync
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.updateStatus('offline');
  }
}

// Global sync manager instance
let syncManager: SyncManager | null = null;

/**
 * Get or create the global sync manager
 */
export function getSyncManager(): SyncManager {
  if (!syncManager) {
    syncManager = new SyncManager();
  }
  return syncManager;
}
