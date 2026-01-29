/**
 * UI rendering and event handling
 * UI reads exclusively from CRDT state
 */
import { getStateManager, ShoppingItem, switchToList, getCurrentListId } from './state';
import { getSyncManager, SyncStatus } from './sync';
import { generatePIN } from './crypto';
import { getAllLists, createList, updateList, deleteList, setActiveListId, type ShoppingList } from './storage';

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
    this.renderLists();
    this.updateListTitle();
  }
  
  /**
   * Update the list title from storage
   */
  private async updateListTitle(): Promise<void> {
    const lists = await getAllLists();
    const currentListId = getCurrentListId();
    const list = lists.find(l => l.id === currentListId);
    if (list) {
      const titleElement = document.getElementById('list-title')!;
      titleElement.textContent = list.name;
    }
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
    
    // Menu button (sidebar toggle)
    const menuButton = document.getElementById('menu-button')!;
    menuButton.addEventListener('click', () => this.toggleSidebar());
    
    // Close sidebar
    const closeSidebar = document.getElementById('close-sidebar')!;
    closeSidebar.addEventListener('click', () => this.toggleSidebar());
    
    // New list button
    const newListButton = document.getElementById('new-list-button')!;
    newListButton.addEventListener('click', () => this.handleNewList());
    
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
    
    // Create hidden checkbox for accessibility
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.completed;
    checkbox.setAttribute('aria-label', `Mark ${item.text} as ${item.completed ? 'incomplete' : 'complete'}`);
    
    const text = document.createElement('span');
    text.textContent = item.text;
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = '×';
    deleteButton.setAttribute('aria-label', `Delete ${item.text}`);
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      getStateManager().deleteItem(item.id);
    });
    
    // Tap entire item to toggle
    li.addEventListener('click', (e) => {
      if (e.target !== deleteButton) {
        getStateManager().toggleItem(item.id);
        // Update checkbox for accessibility
        checkbox.checked = !checkbox.checked;
      }
    });
    
    li.appendChild(checkbox);
    li.appendChild(text);
    li.appendChild(deleteButton);
    
    return li;
  }
  
  /**
   * Update sync status display - invisible unless blocked
   */
  private updateSyncStatus(status: SyncStatus): void {
    const statusMap = {
      offline: { text: 'Offline', class: 'visible' },
      syncing: { text: '', class: '' },
      synced: { text: '', class: '' }
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
  
  /**
   * Toggle sidebar visibility
   */
  private toggleSidebar(): void {
    const sidebar = document.getElementById('sidebar')!;
    sidebar.classList.toggle('hidden');
  }
  
  /**
   * Render all lists in sidebar - luxury minimal
   */
  private async renderLists(): Promise<void> {
    const lists = await getAllLists();
    const container = document.getElementById('lists-container')!;
    const currentListId = getCurrentListId();
    
    container.innerHTML = '';
    
    lists.forEach(list => {
      const li = document.createElement('li');
      li.className = list.id === currentListId ? 'active' : '';
      
      const button = document.createElement('button');
      button.textContent = list.name;
      button.addEventListener('click', () => this.handleSwitchList(list.id));
      
      // Show action buttons on hover via CSS
      const actions = document.createElement('div');
      actions.className = 'actions';
      
      const renameBtn = document.createElement('button');
      renameBtn.textContent = 'Rename';
      renameBtn.setAttribute('aria-label', `Rename ${list.name}`);
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleRenameList(list);
      });
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('aria-label', `Delete ${list.name}`);
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleDeleteList(list);
      });
      
      actions.appendChild(renameBtn);
      actions.appendChild(deleteBtn);
      
      li.appendChild(button);
      li.appendChild(actions);
      container.appendChild(li);
    });
  }
  
  /**
   * Handle creating a new list
   */
  private async handleNewList(): Promise<void> {
    const lists = await getAllLists();
    const name = prompt('Enter list name:', `Shopping List ${lists.length + 1}`);
    if (name && name.trim()) {
      const newList = await createList(name.trim());
      await this.handleSwitchList(newList.id);
      await this.renderLists();
    }
  }
  
  /**
   * Handle switching to a different list
   */
  private async handleSwitchList(listId: string): Promise<void> {
    if (listId === getCurrentListId()) return;
    
    await setActiveListId(listId);
    const newStateManager = await switchToList(listId);
    
    // Re-subscribe to the new state manager
    newStateManager.subscribe(() => this.render());
    
    // Update UI
    const lists = await getAllLists();
    const list = lists.find(l => l.id === listId);
    if (list) {
      const titleElement = document.getElementById('list-title')!;
      titleElement.textContent = list.name;
    }
    
    this.render();
    await this.renderLists();
    this.toggleSidebar();
  }
  
  /**
   * Handle renaming a list
   */
  private async handleRenameList(list: ShoppingList): Promise<void> {
    const newName = prompt('Enter new name:', list.name);
    if (newName && newName.trim() && newName !== list.name) {
      await updateList({ ...list, name: newName.trim() });
      await this.renderLists();
      
      // Update title if it's the active list
      if (list.id === getCurrentListId()) {
        const titleElement = document.getElementById('list-title')!;
        titleElement.textContent = newName.trim();
      }
    }
  }
  
  /**
   * Handle deleting a list
   */
  private async handleDeleteList(list: ShoppingList): Promise<void> {
    const lists = await getAllLists();
    if (lists.length <= 1) {
      alert('Cannot delete the last list');
      return;
    }
    
    if (confirm(`Delete "${list.name}"? This cannot be undone.`)) {
      await deleteList(list.id);
      
      // If deleting active list, switch to another
      if (list.id === getCurrentListId()) {
        const remaining = lists.filter(l => l.id !== list.id);
        if (remaining.length > 0) {
          await this.handleSwitchList(remaining[0].id);
        }
      }
      
      await this.renderLists();
    }
  }
}
