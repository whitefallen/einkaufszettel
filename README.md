# Einkaufszettel - Android-first PWA Shopping List

A privacy-focused, offline-first shopping list Progressive Web App built with CRDT-based state management and end-to-end encryption.

## Features

✅ **Offline-First Architecture**: Works without internet connection using IndexedDB  
✅ **CRDT State Management**: Conflict-free synchronization using Yjs  
✅ **End-to-End Encryption**: All data encrypted with TweetNaCl  
✅ **No User Accounts**: Privacy-first approach with no authentication required  
✅ **Capability-Based Sharing**: Share via links or PINs  
✅ **Minimal Relay Server**: Server cannot inspect or modify encrypted data  
✅ **Event-Based Sync**: Real-time updates without polling  
✅ **Android PWA Support**: Web Push notifications and Background Sync  
✅ **Battery Efficient**: Optimized for mobile battery life  

## Architecture

### Core Principles

1. **CRDT Document as Single Source of Truth**: All application state lives in a Yjs CRDT document
2. **UI Reads from CRDT Only**: No separate state management - UI directly observes CRDT
3. **Encrypted Network Payloads**: All data transmitted is encrypted; server is untrusted
4. **Idempotent & Conflict-Free Sync**: CRDT guarantees eventual consistency
5. **Offline-First**: Application works fully offline, syncs when online

### Technology Stack

- **Frontend**: TypeScript, Vite
- **State Management**: Yjs (CRDT)
- **Storage**: IndexedDB (via idb)
- **Encryption**: TweetNaCl
- **Server**: Node.js + WebSocket (minimal relay)
- **PWA**: Service Workers, Web Push, Background Sync

## Project Structure

```
einkaufszettel/
├── src/
│   ├── main.ts          # Application entry point
│   ├── state.ts         # CRDT state management (Yjs)
│   ├── storage.ts       # IndexedDB persistence layer
│   ├── crypto.ts        # End-to-end encryption (TweetNaCl)
│   ├── sync.ts          # Network synchronization
│   ├── ui.ts            # UI rendering and events
│   └── styles.css       # Application styles
├── server/
│   ├── index.js         # Minimal relay server
│   └── package.json     # Server dependencies
├── public/
│   └── sw.js            # Service Worker for offline support
├── index.html           # HTML entry point
├── vite.config.ts       # Vite build configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Project dependencies
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/whitefallen/einkaufszettel.git
cd einkaufszettel
```

2. Install dependencies:
```bash
npm install
cd server && npm install && cd ..
```

3. Configure environment (optional):
```bash
cp .env.example .env
# Edit .env to set your WebSocket server URL for production
```

### Development

1. Start the relay server:
```bash
npm run server
```

2. In a new terminal, start the development server:
```bash
npm run dev
```

3. Open http://localhost:5173 in your browser

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Deploying the Relay Server

The relay server is a simple WebSocket server that can be deployed to any Node.js hosting:

```bash
cd server
PORT=3000 node index.js
```

**Production Deployment**:

1. Deploy the server to your hosting provider (Railway, Render, Fly.io)
2. Note your server's WebSocket URL (e.g., `wss://your-server.com`)
3. Update the client configuration:

```bash
# In the project root, create or edit .env
echo "VITE_WS_URL=wss://your-server.com" > .env
```

4. Rebuild the client:
```bash
npm run build
```

The client will now connect to your production WebSocket server.

## Usage

### Adding Items

1. Type item name in the input field
2. Click "Add" or press Enter
3. Item is immediately stored locally in IndexedDB
4. If online, encrypted update is sent to relay server

### Completing Items

- Click the checkbox next to an item to mark it as completed
- Completed items are shown with strikethrough

### Deleting Items

- Click the "Delete" button to remove an item permanently

### Clearing Completed

- Click "Clear Completed" to remove all checked items

### Sharing Your List

1. Click the "Share List" button
2. Copy the generated link and share it with others
3. Anyone with the link can join your shopping list
4. Changes sync automatically via the relay server
5. All data is end-to-end encrypted

### Offline Usage

- The app works completely offline
- All changes are saved locally in IndexedDB
- When connection is restored, changes sync automatically
- Background Sync API ensures updates even if app is closed (Android)

## Security & Privacy

### Encryption

- All data is encrypted using **TweetNaCl** (NaCl/libsodium)
- Symmetric encryption with randomly generated keys per room
- Keys are shared only via the capability URL (not stored on server)
- Server cannot decrypt or inspect shopping list contents

### No User Accounts

- No registration, login, or personal information required
- No email addresses, phone numbers, or OAuth
- Privacy-first design: you own your data

### Capability-Based Sharing

- Access is granted via cryptographic capability URLs
- Anyone with the URL can access the shared list
- No server-side access control needed
- Revoke access by creating a new room and sharing new link

## CRDT Conflict Resolution

The app uses **Yjs** for CRDT-based state management:

- **Automatic Conflict Resolution**: Multiple users can edit simultaneously
- **Eventual Consistency**: All peers converge to the same state
- **No Manual Merging**: CRDTs handle conflicts automatically
- **Causality Preservation**: Changes maintain logical ordering

Example: If User A and User B both add items offline, when they come online, both items appear in both lists without conflicts.

## Android PWA Features

### Installation

On Android Chrome:
1. Visit the app URL
2. Tap the "Add to Home Screen" prompt
3. App installs like a native app

### Web Push Notifications

- Receive notifications when list is updated by others
- Requires notification permission on first use
- Battery-efficient push delivery

### Background Sync

- Changes sync even when app is closed
- Android's Background Sync API ensures delivery
- Survives app termination and device restarts

## Browser Support

- **Chrome/Edge 90+**: Full support
- **Firefox 89+**: Full support (except Background Sync)
- **Safari 15+**: Partial support (no Background Sync)
- **Android Chrome**: Recommended (full PWA features)
- **iOS Safari**: Limited (no Background Sync, limited PWA features)

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Type Checking

TypeScript compilation is part of the build process:
```bash
npm run build
```

## Architecture Decisions

### Why Yjs?

- Proven CRDT library with excellent performance
- Supports various data structures (Map, Array, Text)
- Binary encoding for efficient network transfer
- Active development and community

### Why TweetNaCl?

- Audited, secure cryptography library
- Simple API for encryption/decryption
- Small bundle size (~7KB)
- Pure JavaScript (no native dependencies)

### Why IndexedDB?

- Native browser storage (no external dependencies)
- Large storage quotas (much larger than localStorage)
- Async API (doesn't block main thread)
- Transactional and reliable

### Why Minimal Server?

- Reduces operational complexity
- Server cannot access user data
- Easier to deploy and maintain
- Lower attack surface

## Limitations & Non-Goals

- **No iOS Background Support**: iOS Safari doesn't support Background Sync
- **No Real-Time Guarantees**: Best-effort delivery, not guaranteed instant sync
- **No User Accounts**: By design - privacy over features
- **No Server-Side Validation**: Trust model assumes honest clients

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Keep changes minimal and focused
2. Maintain offline-first architecture
3. Ensure encryption remains end-to-end
4. Document all public APIs
5. Write tests for new features

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [Yjs](https://github.com/yjs/yjs) - CRDT framework
- [TweetNaCl.js](https://github.com/dchest/tweetnacl-js) - Cryptography
- [idb](https://github.com/jakearchibald/idb) - IndexedDB wrapper
- [Vite](https://vitejs.dev/) - Build tool

## Support

For issues and questions, please use GitHub Issues.