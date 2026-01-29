/**
 * UI rendering and event handling
 * UI reads exclusively from CRDT state
 */
import { getStateManager, ShoppingItem } from './state';
import { getSyncManager, SyncStatus } from './sync';
import { generatePIN } from './crypto';

/**
 * UI Manager handles all DOM interactions
 */
export class UIManager {
  private listElement: HTMLElement;
  private inputElement: HTMLInputElement;
  private statusElement: HTMLElement;
  
  constructor() {
    this.listElement = document.getElementById('shopping-list')!;
    this.inputElement = document.getElementById('item-input') as HTMLInputElement;
    this.statusElement = document.getElementById('sync-status')!;
    
    this.setupEventListeners();
    this.render();
  }
  
  /**
   * Set up all event listeners
   */
  private setupEventListeners(): void {
    // Add item
    const addButton = document.getElementById('add-button')!;
    addButton.addEventListener('click', () => this.handleAddItem());
    
    this.inputElement.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleAddItem();
      }
    });
    
    // Share button
    const shareButton = document.getElementById('share-button')!;
    shareButton.addEventListener('click', () => this.showShareModal());
    
    // Clear completed
    const clearButton = document.getElementById('clear-completed')!;
    clearButton.addEventListener('click', () => this.handleClearCompleted());
    
    // Close modal
    const closeModal = document.getElementById('close-modal')!;
    closeModal.addEventListener('click', () => this.hideShareModal());
    
    // Subscribe to state changes
    getStateManager().subscribe(() => this.render());
    
    // Subscribe to sync status changes
    getSyncManager().onStatusChange((status) => this.updateSyncStatus(status));
  }
  
  /**
   * Handle adding a new item
   */
  private handleAddItem(): void {
    const text = this.inputElement.value.trim();
    if (text) {
      getStateManager().addItem(text);
      this.inputElement.value = '';
      this.inputElement.focus();
    }
  }
  
  /**
   * Handle clearing completed items
   */
  private handleClearCompleted(): void {
    getStateManager().clearCompleted();
  }
  
  /**
   * Render the shopping list
   */
  render(): void {
    const items = getStateManager().getItems();
    
    this.listElement.innerHTML = '';
    
    if (items.length === 0) {
      this.listElement.innerHTML = '<li style="text-align: center; padding: 2rem; color: #999;">No items yet. Add one above!</li>';
      return;
    }
    
    items.forEach(item => {
      const li = this.createItemElement(item);
      this.listElement.appendChild(li);
    });
  }
  
  /**
   * Create a list item element
   */
  private createItemElement(item: ShoppingItem): HTMLElement {
    const li = document.createElement('li');
    li.className = `shopping-item ${item.completed ? 'completed' : ''}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'item-checkbox';
    checkbox.checked = item.completed;
    checkbox.addEventListener('change', () => {
      getStateManager().toggleItem(item.id);
    });
    
    const text = document.createElement('span');
    text.className = 'item-text';
    text.textContent = item.text;
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'item-delete';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
      getStateManager().deleteItem(item.id);
    });
    
    li.appendChild(checkbox);
    li.appendChild(text);
    li.appendChild(deleteButton);
    
    return li;
  }
  
  /**
   * Update sync status display
   */
  private updateSyncStatus(status: SyncStatus): void {
    const statusMap = {
      offline: { text: '● Offline', class: 'offline-indicator' },
      syncing: { text: '● Syncing...', class: 'syncing-indicator' },
      synced: { text: '● Synced', class: 'synced-indicator' }
    };
    
    const { text, class: className } = statusMap[status];
    this.statusElement.textContent = text;
    this.statusElement.className = className;
  }
  
  /**
   * Show share modal with link and PIN
   */
  private showShareModal(): void {
    const modal = document.getElementById('share-modal')!;
    const linkInput = document.getElementById('share-link') as HTMLInputElement;
    const pinElement = document.getElementById('share-pin')!;
    
    const credentials = getSyncManager().getRoomCredentials();
    if (!credentials) {
      alert('Sync not initialized. Please wait...');
      return;
    }
    
    // Generate share link
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set('room', credentials.roomId);
    shareUrl.searchParams.set('key', credentials.roomKey);
    linkInput.value = shareUrl.toString();
    
    // Generate PIN (for verbal sharing)
    const pin = generatePIN();
    pinElement.textContent = pin;
    
    modal.classList.remove('hidden');
    linkInput.select();
  }
  
  /**
   * Hide share modal
   */
  private hideShareModal(): void {
    const modal = document.getElementById('share-modal')!;
    modal.classList.add('hidden');
  }
}
