/**
 * Minimal relay server for encrypted message passing
 * Server cannot inspect or modify data - only relays encrypted payloads
 */
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = process.env.PORT || 3000;

// Store rooms and their connections
const rooms = new Map();

/**
 * Relay server - passes encrypted messages between peers
 */
class RelayServer {
  constructor() {
    const server = createServer();
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws) => {
      console.log('Client connected');
      
      let currentRoom = null;
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          switch (message.type) {
            case 'join':
              this.handleJoin(ws, message.roomId);
              currentRoom = message.roomId;
              break;
              
            case 'update':
              this.handleUpdate(message.roomId, message.payload, ws);
              break;
              
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error handling message:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('Client disconnected');
        if (currentRoom) {
          this.handleLeave(ws, currentRoom);
        }
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
    
    server.listen(PORT, () => {
      console.log(`Relay server listening on port ${PORT}`);
    });
  }
  
  /**
   * Handle client joining a room
   */
  handleJoin(ws, roomId) {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    
    rooms.get(roomId).add(ws);
    console.log(`Client joined room: ${roomId} (${rooms.get(roomId).size} clients)`);
    
    // Send acknowledgment
    ws.send(JSON.stringify({
      type: 'joined',
      roomId
    }));
  }
  
  /**
   * Handle client leaving a room
   */
  handleLeave(ws, roomId) {
    const room = rooms.get(roomId);
    if (room) {
      room.delete(ws);
      console.log(`Client left room: ${roomId} (${room.size} clients remaining)`);
      
      // Clean up empty rooms
      if (room.size === 0) {
        rooms.delete(roomId);
        console.log(`Room ${roomId} deleted (empty)`);
      }
    }
  }
  
  /**
   * Handle encrypted update relay
   * Server doesn't decrypt - just forwards the encrypted payload
   */
  handleUpdate(roomId, payload, sender) {
    const room = rooms.get(roomId);
    if (!room) {
      console.log(`Room ${roomId} not found`);
      return;
    }
    
    // Broadcast to all clients in room except sender
    const message = JSON.stringify({
      type: 'update',
      payload
    });
    
    const { OPEN } = sender.constructor;
    room.forEach((client) => {
      if (client !== sender && client.readyState === OPEN) {
        client.send(message);
      }
    });
    
    console.log(`Relayed update to ${room.size - 1} clients in room ${roomId}`);
  }
}

// Start the relay server
new RelayServer();
