/* Shared block-data reader and selection contract for all locator sections. */
(() => {
  if (window.MaxbuyStoreLocator) return;

  const storageKey = 'currentStoreSelected';
  window.MaxbuyStoreLocator = {
    getSource(scope) {
      if (scope?.querySelector) return scope.querySelector('[data-store-locator-source]');
      const sources = [...document.querySelectorAll('[data-store-locator-source]')];
      return scope ? sources.find(source => source.dataset.sectionId === scope) :
        sources.find(source => source.dataset.sourceRole === 'popup');
    },
    getStores(scope) {
      const source = this.getSource(scope);
      if (!source) return [];
      try {
        const stores = JSON.parse(source.textContent);
        return Array.isArray(stores) ? stores : [];
      } catch {
        return [];
      }
    },
    getSelection() {
      try {
        return JSON.parse(localStorage.getItem(storageKey)) || {};
      } catch {
        return {};
      }
    },
    findSelectedStore(stores, selection, sectionId) {
      if (!selection?.selectedStore) return null;
      // Block IDs belong to a section. Two independent locator sections may share an ID.
      if (!selection.sectionId || selection.sectionId === sectionId) {
        const byId = stores.find(store => store.id === selection.currentSelected);
        if (byId) return byId;
      }
      const migrated = stores.find(store => store.id === selection.currentSelected &&
        store.name === selection.selectedStore && store.address === selection.address);
      if (migrated) return migrated;
      const matches = stores.filter(store => store.name === selection.selectedStore &&
        (!selection.address || store.address === selection.address));
      return matches.length === 1 ? matches[0] : null;
    },
    selectStore(id, scope) {
      const source = this.getSource(scope);
      const store = this.getStores(scope).find(item => item.id === id);
      if (!store) return false;
      this.updateSelection({
        selectedStore: store.name,
        currentSelected: store.id,
        sectionId: source.dataset.sectionId,
        address: store.address
      });
      return true;
    },
    clearSelection() {
      this.updateSelection(null);
    },
    updateSelection(selection) {
      try {
        if (selection) localStorage.setItem(storageKey, JSON.stringify(selection));
        else localStorage.removeItem(storageKey);
      } catch {
        // Store selection still works for the current page when storage is unavailable.
      }
      const state = window.Alpine?.store('xStoreMap');
      if (state) state.currentStoreSelected = selection?.selectedStore || '';
      document.dispatchEvent(new CustomEvent('maximize:store-changed', {
        detail: { store: selection?.selectedStore || '', id: selection?.currentSelected || false, selection }
      }));
    }
  };
})();
