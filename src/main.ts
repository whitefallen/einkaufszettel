/**
 * Main application entry point
 * Initializes all modules and sets up the PWA
 */
import { initDB } from './storage';
import { getStateManager } from './state';
import { getSyncManager } from './sync';
import { UIManager } from './ui';
import { base64ToKey } from './crypto';

/**
 * Register service worker for offline support
 */
async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        type: 'module'
      });
      console.log('Service Worker registered:', registration);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available, reload to activate
              if (confirm('New version available! Reload to update?')) {
                window.location.reload();
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

/**
 * Request notification permission (Android Web Push)
 */
async function requestNotificationPermission(): Promise<void> {
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }
  }
}

/**
 * Initialize the application
 */
async function init(): Promise<void> {
  try {
    console.log('Initializing shopping list app...');
    
    // Initialize IndexedDB
    await initDB();
    console.log('Database initialized');
    
    // Initialize state manager and restore from storage
    const state = getStateManager();
    await state.restore();
    console.log('State restored');
    
    // Check for shared room in URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    const roomKey = urlParams.get('key');
    
    // Initialize sync
    const sync = getSyncManager();
    if (roomId && roomKey) {
      console.log('Joining shared room...');
      await sync.init(roomId, base64ToKey(roomKey));
      // Clean URL after joining
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      await sync.init();
    }
    console.log('Sync initialized');
    
    // Initialize UI
    new UIManager();
    console.log('UI initialized');
    
    // Register service worker
    await registerServiceWorker();
    
    // Request notification permission
    await requestNotificationPermission();
    
    // Set up background sync for Android
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.ready;
      if ('sync' in reg) {
        try {
          await (reg as any).sync.register('sync-shopping-list');
          console.log('Background sync registered');
        } catch (error) {
          console.error('Background sync registration failed:', error);
        }
      }
    }
    
    console.log('App initialized successfully!');
  } catch (error) {
    console.error('Failed to initialize app:', error);
    alert('Failed to initialize app. Please refresh the page.');
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Handle online/offline events
window.addEventListener('online', () => {
  console.log('Network online');
  getSyncManager().init();
});

window.addEventListener('offline', () => {
  console.log('Network offline');
});
