# Architecture Documentation

## Overview

Einkaufszettel is an Android-first PWA shopping list application built with a focus on privacy, offline-first functionality, and conflict-free synchronization.

## Core Components

### 1. State Management (`src/state.ts`)

**Technology**: Yjs CRDT (Conflict-free Replicated Data Type)

**Purpose**: Single source of truth for all application state

**Key Features**:
- All shopping list items stored in a Yjs Map
- Automatic conflict resolution when multiple users edit simultaneously
- Observable pattern for UI updates
- Updates automatically persisted to IndexedDB

**Design Pattern**:
```
User Action → State Manager → Yjs CRDT → Auto Persist → UI Update
```

### 2. Storage Layer (`src/storage.ts`)

**Technology**: IndexedDB via idb wrapper

**Purpose**: Offline-first local persistence

**Stores**:
- `updates`: CRDT update log (versioned, timestamped)
- `metadata`: Encryption keys, room credentials, settings

**Key Features**:
- Transactional updates
- Indexed by timestamp for efficient sync
- Graceful degradation when unavailable (e.g., in tests)

### 3. Encryption (`src/crypto.ts`)

**Technology**: TweetNaCl (NaCl/libsodium port)

**Purpose**: End-to-end encryption of all data

**Encryption Schemes**:
- **Symmetric (secretbox)**: Room-based data encryption
  - Random 32-byte keys per room
  - 24-byte nonces (never reused)
  - XSalsa20-Poly1305 authenticated encryption
  
- **Asymmetric (box)**: Future feature for user-to-user messages
  - Curve25519 key exchange
  - NaCl box construction

**Security Properties**:
- Server cannot decrypt data (zero-knowledge)
- Keys shared only via capability URLs
- No key material stored on server

### 4. Network Sync (`src/sync.ts`)

**Technology**: WebSocket for real-time bidirectional communication

**Purpose**: Event-based synchronization between peers

**Architecture**:
```
Client 1 → Encrypt → WebSocket → Relay Server → WebSocket → Decrypt → Client 2
```

**Server Role**: 
- Message relay only (cannot inspect payloads)
- Room-based broadcast
- No state persistence
- No authentication

**Sync Protocol**:
1. Client joins room with room ID
2. Client sends encrypted CRDT update
3. Server broadcasts to all other room members
4. Recipients decrypt and apply update
5. Yjs CRDT ensures convergence

**Reconnection**:
- Automatic reconnection with exponential backoff
- Connection state exposed to UI
- Queued updates sent when reconnected

### 5. UI Layer (`src/ui.ts`)

**Technology**: Vanilla JavaScript/DOM manipulation

**Purpose**: Reactive UI that reads exclusively from CRDT state

**Pattern**: Observer Pattern
- UI subscribes to state changes
- Re-renders on any CRDT update
- No local UI state

**Simplicity Rationale**:
- No framework overhead
- Direct DOM manipulation is fast
- Easier to understand and maintain
- Smaller bundle size

### 6. Service Worker (`public/sw.js`)

**Technology**: Service Worker API, Cache API

**Purpose**: Offline-first PWA capabilities

**Caching Strategy**:
- **Precache**: Static assets on install
- **Runtime Cache**: Dynamic resources
- **Stale-while-revalidate**: Serve from cache, update in background

**Android Features**:
- **Background Sync**: Queued sync when connection restored
- **Web Push**: Server-sent notifications
- **Install Prompt**: Add to home screen

### 7. Relay Server (`server/index.js`)

**Technology**: Node.js + ws (WebSocket library)

**Purpose**: Minimal message relay (untrusted)

**Design Principles**:
- No data persistence
- No payload inspection
- No authentication/authorization
- Ephemeral room management

**Data Model**:
```javascript
rooms: Map<RoomID, Set<WebSocket>>
```

**Message Types**:
- `join`: Client joins a room
- `update`: Encrypted CRDT update to broadcast
- `joined`: Acknowledgment to client

## Data Flow

### Adding an Item

1. User types in input field
2. User clicks "Add" or presses Enter
3. `UIManager.handleAddItem()` called
4. `StateManager.addItem(text)` generates unique ID
5. Yjs Map updated with new item
6. Yjs emits 'update' event
7. Update persisted to IndexedDB
8. Update encrypted and sent to server (if online)
9. Server broadcasts to other clients
10. UI re-renders automatically (observer pattern)

### Offline → Online Transition

1. Network comes back online
2. `window.addEventListener('online')` fires
3. SyncManager reconnects to server
4. Full state sent as encrypted update
5. Other clients receive and merge changes
6. Yjs CRDT ensures no conflicts

### Sharing a List

1. User clicks "Share List"
2. UI generates shareable URL with:
   - Room ID (identifies the shared list)
   - Encryption key (base64-encoded)
3. Recipient opens URL
4. App extracts room ID and key from URL params
5. SyncManager joins room with credentials
6. Full state synced from existing peer
7. Both users now share the same CRDT document

## Security Model

### Threat Model

**Trusted**:
- Client devices
- End users
- HTTPS/TLS transport

**Untrusted**:
- Relay server
- Network intermediaries
- Cloud providers

### Security Guarantees

1. **Confidentiality**: Server cannot read shopping list contents
2. **Integrity**: Authenticated encryption prevents tampering
3. **Availability**: Offline-first ensures local availability
4. **No Authentication**: Privacy by design (no user tracking)

### Known Limitations

1. **No Forward Secrecy**: Compromised key reveals all past messages
2. **No User Authentication**: Anyone with URL can access
3. **Simple KDF**: PIN-to-key derivation is basic (demo only)
4. **No Key Rotation**: Keys are static per room

## Performance Considerations

### Bundle Size
- Vite tree-shaking removes unused code
- TweetNaCl: ~7KB gzipped
- Yjs: ~20KB gzipped
- idb: ~2KB gzipped
- Total: ~130KB (compressed)

### Battery Efficiency
- Event-based sync (no polling)
- WebSocket kept alive efficiently
- Service Worker minimizes network traffic
- Background Sync batches updates

### Memory Usage
- Yjs uses efficient binary encoding
- IndexedDB stores data out-of-process
- UI re-renders only changed items

## Testing Strategy

### Unit Tests
- Crypto functions (encryption, key generation)
- State management (CRDT operations)
- Mocked storage and network

### Integration Tests
- Not yet implemented
- Would test full sync flow

### Manual Testing
- Offline mode
- Multi-device sync
- Background sync (Android)
- Service worker updates

## Deployment

### Client
- Static files served from any web host
- Build output in `dist/`
- No server-side rendering needed

### Server
- Node.js WebSocket server
- Can run on minimal infrastructure
- Environment variable: `PORT`

### Recommended Stack
- **Client**: Netlify, Vercel, GitHub Pages
- **Server**: Railway, Render, Fly.io
- **TLS**: Automatic via hosting providers

## Future Enhancements

### Planned
- User authentication (optional)
- Multiple lists per user
- List templates
- Shopping categories
- Expiry/reminder notifications

### Under Consideration
- P2P sync (WebRTC)
- Offline-first search
- Import/export functionality
- Desktop app (Electron/Tauri)

## References

- [Yjs Documentation](https://docs.yjs.dev/)
- [TweetNaCl Spec](https://tweetnacl.js.org/)
- [IndexedDB Guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Worker Cookbook](https://serviceworke.rs/)
- [Web Push Protocol](https://tools.ietf.org/html/rfc8030)
