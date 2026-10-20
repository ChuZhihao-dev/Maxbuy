(() => {
  if (customElements.get('maxbuy-store-locator')) return;

  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();

  // Older stores keep telephone and weekly hours together in the details field.
  // Preserve those hours as a schedule rather than claiming they are today's hours.
  function withLegacyDetails(store) {
    const template = document.createElement('template');
    template.innerHTML = (store.details || '').replace(/<br\s*\/?\s*>|<\/p>/gi, '\n');
    const lines = template.content.textContent.split('\n').map(line => line.trim()).filter(Boolean);
    const phoneLine = lines.find(line => /^[+()\d\s.-]+$/.test(line) && line.replace(/\D/g, '').length >= 6);
    const hoursStart = lines.findIndex(line => /^store hours\s*:?$/i.test(line));
    return {
      ...store,
      phone: store.phone || phoneLine || '',
      hours: store.hours || (hoursStart >= 0 ? lines.slice(hoursStart + 1).join(' / ') : ''),
      otherDetails: !store.phone && !store.hours && !phoneLine && hoursStart < 0 ? lines.join('\n') : ''
    };
  }

  class MaxbuyStoreLocator extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      const { signal } = this.controller;
      this.results = this.querySelector('[data-store-results]');
      this.searchInput = this.querySelector('input[type="search"]');
      this.map = this.querySelector('[data-store-map]');
      this.placeholder = this.querySelector('[data-map-placeholder]');
      this.mapMessage = this.querySelector('[data-map-message]');
      this.mapFallback = this.querySelector('[data-map-fallback]');
      this.cards = new Map([...this.results.querySelectorAll('[data-store-card]')].map(card => [card.dataset.storeId, card]));
      this.status = this.querySelector('[data-results-status]');
      this.selectButton = this.querySelector('[data-select-store]');
      this.page = 0;
      this.mobileQuery = window.matchMedia('(max-width: 767px)');
      this.pagination = this.querySelector('[data-store-pagination]');
      this.previousStores = this.querySelector('[data-previous-stores]');
      this.nextStores = this.querySelector('[data-next-stores]');
      this.previousStores.addEventListener('click', () => {
        this.page -= 1;
        this.filterStores(false);
      }, { signal });
      this.nextStores.addEventListener('click', () => {
        this.page += 1;
        this.filterStores(false);
      }, { signal });
      this.mobileQuery.addEventListener('change', () => this.filterStores(), { signal });
      this.map.addEventListener('load', () => {
        if (!this.map.getAttribute('src') || !this.activeStore?.address) return;
        clearTimeout(this.mapTimeout);
        this.map.hidden = false;
        this.placeholder.hidden = true;
      }, { signal });
      this.map.addEventListener('error', () => this.showMapFallback(), { signal });

      this.querySelector('form').addEventListener('submit', event => {
        event.preventDefault();
        this.filterStores();
      }, { signal });
      this.searchInput.addEventListener('input', () => this.filterStores(), { signal });
      this.results.addEventListener('click', event => {
        const button = event.target.closest('.store-showcase__card-select');
        if (button) this.activateStore(button.dataset.storeId);
      }, { signal });
      this.selectButton?.addEventListener('click', () => {
        if (window.MaxbuyStoreLocator.selectStore(this.activeId, this)) {
          this.status.textContent = `${this.selectButton.dataset.selectedLabel}: ${this.activeStore.name}`;
        }
      }, { signal });
      document.addEventListener('maximize:store-changed', event => {
        const selection = event.detail.selection ?? window.MaxbuyStoreLocator.getSelection();
        this.selectedId = window.MaxbuyStoreLocator.findSelectedStore(this.stores, selection, this.dataset.sectionId)?.id;
        if (this.visibleStores.some(store => store.id === this.selectedId)) this.activateStore(this.selectedId);
        else this.updateActions();
      }, { signal });
      document.addEventListener('shopify:block:select', event => {
        const id = event.detail.blockId;
        if (!this.cards.has(id) || !this.contains(event.target)) return;
        this.searchInput.value = '';
        this.page = this.mobileQuery.matches ? Math.floor(this.stores.findIndex(store => store.id === id) / 3) : 0;
        this.filterStores(false);
        this.activateStore(id);
        this.cards.get(id).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, { signal });
      this.mapVisible = !('IntersectionObserver' in window);
      if (!this.mapVisible) {
        this.observer = new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) {
            this.mapVisible = true;
            this.updateMap();
            this.observer.disconnect();
          }
        }, { rootMargin: '250px' });
        this.observer.observe(this.querySelector('[data-map-container]'));
      }
      this.refreshStores();
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.controller = null;
      this.observer?.disconnect();
      clearTimeout(this.mapTimeout);
    }

    refreshStores() {
      if (!this.isConnected) return;
      this.stores = window.MaxbuyStoreLocator.getStores(this).map(withLegacyDetails);
      this.selectedId = window.MaxbuyStoreLocator.findSelectedStore(this.stores, window.MaxbuyStoreLocator.getSelection(), this.dataset.sectionId)?.id;
      if (!this.activeId) this.activeId = this.selectedId;
      for (const store of this.stores) {
        const card = this.cards.get(store.id);
        if (!card) continue;
        card.title = [store.name, store.address, store.hours, store.phone, store.otherDetails].filter(Boolean).join('\n');
        card.querySelector('[data-store-hours]').textContent = store.hours;
        card.querySelector('[data-hours-row]').hidden = !store.hours;
        const phone = card.querySelector('[data-store-phone]');
        phone.textContent = store.phone;
        phone.href = `tel:${store.phone.replace(/[^+\d]/g, '')}`;
        card.querySelector('[data-phone-row]').hidden = !store.phone;
        const details = card.querySelector('[data-store-details]');
        details.textContent = store.otherDetails;
        details.hidden = !store.otherDetails;
      }
      this.filterStores();
    }

    filterStores(resetPage = true) {
      if (resetPage) this.page = 0;
      const terms = normalize(this.searchInput.value).trim().split(/\s+/).filter(Boolean);
      const matchingStores = this.stores.filter(store => {
        const searchable = normalize([store.name, store.address, store.keywords].join(' '));
        return terms.every(term => searchable.includes(term));
      });
      const lastPage = Math.max(0, Math.ceil(matchingStores.length / 3) - 1);
      this.page = Math.min(Math.max(this.page, 0), lastPage);
      this.visibleStores = this.mobileQuery.matches ? matchingStores.slice(this.page * 3, this.page * 3 + 3) : matchingStores;
      const visibleIds = new Set(this.visibleStores.map(store => store.id));
      for (const [id, card] of this.cards) card.hidden = !visibleIds.has(id);
      this.results.hidden = matchingStores.length === 0;
      this.pagination.hidden = matchingStores.length === 0;
      this.previousStores.disabled = this.page === 0;
      this.nextStores.disabled = this.page >= lastPage;
      this.querySelector('[data-no-stores]').hidden = this.stores.length > 0;
      this.querySelector('[data-no-results]').hidden = !this.stores.length || this.visibleStores.length > 0;
      this.status.textContent = this.dataset.resultLabel.replace('{count}', matchingStores.length);
      const active = this.visibleStores.find(store => store.id === this.activeId) || this.visibleStores[0];
      this.activateStore(active?.id || null);
    }

    get activeStore() {
      return this.visibleStores.find(store => store.id === this.activeId);
    }

    activateStore(id) {
      this.activeId = id;
      for (const button of this.results.querySelectorAll('.store-showcase__card-select')) {
        const active = button.dataset.storeId === id;
        button.setAttribute('aria-pressed', String(active));
        button.parentElement.classList.toggle('is-active', active);
      }
      this.updateMap();
      this.updateActions();
    }

    updateMap() {
      const store = this.activeStore;
      if (!store?.address) {
        clearTimeout(this.mapTimeout);
        this.map.removeAttribute('src');
        this.map.hidden = true;
        this.placeholder.hidden = false;
        this.placeholder.classList.remove('is-loading');
        this.mapMessage.textContent = this.mapMessage.dataset.defaultMessage;
        this.mapFallback.hidden = true;
        return;
      }
      if (!this.mapVisible) return;
      const url = window.MaxbuyMapUrl(store.address);
      this.map.title = `${this.dataset.mapLabel}: ${store.name}`;
      if (this.map.getAttribute('src') !== url) {
        clearTimeout(this.mapTimeout);
        // Keep the iframe measurable while loading: embedded maps need a real viewport.
        this.map.hidden = false;
        this.placeholder.hidden = false;
        this.placeholder.classList.add('is-loading');
        this.mapMessage.textContent = this.dataset.mapLoading;
        this.mapFallback.hidden = true;
        this.mapFallback.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.address)}`;
        this.map.setAttribute('src', url);
        this.mapTimeout = setTimeout(() => this.showMapFallback(), 12000);
      }
    }

    showMapFallback() {
      if (!this.activeStore?.address) return;
      this.mapMessage.textContent = this.dataset.mapFailed;
      this.mapFallback.hidden = false;
      this.placeholder.hidden = false;
    }

    updateActions() {
      const store = this.activeStore;
      const actions = this.querySelector('[data-store-actions]');
      if (!actions) return;
      actions.hidden = !store;
      if (!store) return;
      const directions = this.querySelector('[data-directions]');
      directions.hidden = !store.address;
      directions.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.address || '')}`;
      const selected = store.id === this.selectedId;
      this.selectButton.disabled = selected;
      this.selectButton.textContent = selected ? this.selectButton.dataset.selectedLabel : this.selectButton.dataset.defaultLabel;
    }
  }

  customElements.define('maxbuy-store-locator', MaxbuyStoreLocator);
})();
