/* Progressive enhancement of a native Shopify collection GET form. */
(() => {
  if (customElements.get('maxbuy-collection')) return;
  class MaxbuyCollection extends HTMLElement {
    connectedCallback() {
      if (this.life) return;
      this.life = new AbortController();
      this.sequence = 0;
      this.cache = new Map();
      this.animations = new Map();
      this.media = window.matchMedia('(min-width: 768px)');
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const options = { signal: this.life.signal };
      this.addEventListener('click', event => this.onClick(event), options);
      this.addEventListener('input', event => this.onInput(event), options);
      this.addEventListener('change', event => this.onChange(event), options);
      this.addEventListener('submit', event => {
        if (!event.target.matches('[data-collection-form]')) return;
        event.preventDefault();
        this.submit();
      }, options);
      this.addEventListener('cancel', event => {
        if (event.target.matches('dialog')) { event.preventDefault(); this.closePanel(); }
      }, { ...options, capture: true });
      this.addEventListener('close', event => {
        if (event.target.matches('dialog') && !event.target.open && !this.replacing) this.unlockBody();
      }, { ...options, capture: true });
      this.media.addEventListener('change', () => this.initPanel(), options);
      window.addEventListener('popstate', () => {
        clearTimeout(this.timer);
        this.navigate(new URL(location.href), { history: false, scroll: true });
      }, options);
      this.initContent();
      this.cache.set(this.cacheKey(new URL(location.href)), this.results.innerHTML);
    }
    disconnectedCallback() {
      clearTimeout(this.timer);
      this.request?.abort();
      this.life?.abort();
      this.animations?.forEach(animation => animation.cancel());
      this.dialog?.close();
      this.unlockBody();
      this.life = null;
    }
    get results() { return this.querySelector('[data-collection-results]'); }
    get duration() {
      return this.reduced.matches ? 0 : parseFloat(getComputedStyle(this).getPropertyValue('--collection-motion')) || 0;
    }
    initContent() {
      this.dialog = this.querySelector('dialog');
      this.initPanel();
      this.querySelectorAll('[data-price-filter]').forEach(price => this.syncPrice(price));
    }
    initPanel() {
      if (!this.dialog) return;
      this.dialog.getAnimations().forEach(animation => animation.cancel());
      if (this.media.matches) {
        if (this.dialog.matches(':modal')) this.dialog.close();
        if (!this.dialog.open) this.dialog.show();
        this.unlockBody();
      } else if (!this.dialog.matches(':modal')) {
        this.dialog.close();
        this.unlockBody();
      }
    }
    lockBody() {
      if (this.previousOverflow !== undefined) return;
      this.previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    unlockBody() {
      if (this.previousOverflow === undefined) return;
      document.body.style.overflow = this.previousOverflow;
      this.previousOverflow = undefined;
    }
    openPanel(animate = true) {
      if (!this.dialog || this.media.matches) return;
      if (!this.dialog.open) this.dialog.showModal();
      this.lockBody();
      if (animate && this.duration) this.dialog.animate([{ transform: 'translateX(100%)', opacity: .6 }, { transform: 'translateX(0)', opacity: 1 }], { duration: this.duration, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
    async closePanel(animate = true) {
      const dialog = this.dialog;
      if (!dialog?.matches(':modal') || this.closingPanel) return;
      this.closingPanel = true;
      if (animate && this.duration) {
        try { await dialog.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], { duration: this.duration, easing: 'ease-in' }).finished; } catch (_) { /* Resize/unload cancels motion. */ }
      }
      if (dialog !== this.dialog) return;
      if (!this.media.matches) dialog.close();
      this.closingPanel = false;
      this.unlockBody();
      this.querySelector('[data-filters-open]')?.focus({ preventScroll: true });
    }
    onClick(event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-filters-open]')) { this.openPanel(); return; }
      if (target.closest('[data-filters-close]')) { this.closePanel(); return; }
      if (target === this.dialog && this.dialog.matches(':modal')) {
        const rect = this.dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.closePanel();
        return;
      }
      if (target.closest('[data-collection-retry]')) {
        this.navigate(this.failedURL || new URL(location.href), this.failedOptions);
        return;
      }
      const summary = target.closest('.maxbuy-collection__filter > summary');
      if (summary) { event.preventDefault(); this.toggleDetails(summary.parentElement); return; }
      const link = target.closest('a[data-collection-link]');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.pathname !== this.dataset.collectionUrl) return;
      event.preventDefault();
      clearTimeout(this.timer);
      this.navigate(url, { scroll: link.hasAttribute('data-page-link'), focusHeading: true });
    }
    toggleDetails(details) {
      const old = this.animations.get(details);
      const current = details.getBoundingClientRect().height;
      const opening = old ? details.dataset.motionTarget !== 'open' : !details.open;
      old?.cancel();
      details.style.height = '';
      details.open = true;
      const summaryHeight = details.querySelector('summary').getBoundingClientRect().height;
      const target = opening ? details.getBoundingClientRect().height : summaryHeight;
      if (!this.duration) { details.open = opening; return; }
      details.style.overflow = 'hidden';
      details.dataset.motionTarget = opening ? 'open' : 'closed';
      const animation = details.animate([{ height: `${current}px` }, { height: `${target}px` }], { duration: this.duration, easing: 'ease-in-out' });
      this.animations.set(details, animation);
      animation.finished.then(() => {
        if (this.animations.get(details) !== animation) return;
        details.open = opening;
        details.style.overflow = '';
        delete details.dataset.motionTarget;
        this.animations.delete(details);
      }).catch(() => {});
    }
    onInput(event) {
      const target = event.target;
      if (target.matches('[data-range], [data-price]')) {
        this.syncPrice(target.closest('[data-price-filter]'), target);
        if (target.matches('[data-price]')) this.schedule(650);
      }
    }
    onChange(event) {
      if (event.target.matches('[data-collection-sort], [data-collection-form] input')) {
        if (event.target.closest('[data-price-filter]')) this.syncPrice(event.target.closest('[data-price-filter]'), event.target);
        this.schedule(event.target.type === 'checkbox' ? 100 : 0);
      }
    }
    syncPrice(price, source) {
      const max = Number(price.dataset.rangeMax);
      const fields = { min: price.querySelector('[data-price="min"]'), max: price.querySelector('[data-price="max"]') };
      const ranges = { min: price.querySelector('[data-range="min"]'), max: price.querySelector('[data-range="max"]') };
      if (source?.dataset.range) fields[source.dataset.range].value = source.value;
      let minValue = fields.min.value === '' ? 0 : Number(fields.min.value);
      let maxValue = fields.max.value === '' ? max : Number(fields.max.value);
      minValue = Math.min(max, Math.max(0, Number.isFinite(minValue) ? minValue : 0));
      maxValue = Math.min(max, Math.max(0, Number.isFinite(maxValue) ? maxValue : max));
      if (minValue > maxValue) {
        if ((source?.dataset.price || source?.dataset.range) === 'max') maxValue = minValue;
        else minValue = maxValue;
      }
      ranges.min.value = minValue;
      ranges.max.value = maxValue;
      if (fields.min.value !== '') fields.min.value = minValue;
      if (fields.max.value !== '') fields.max.value = maxValue;
      fields.min.max = maxValue;
      fields.max.min = minValue;
      price.style.setProperty('--range-min', `${max ? minValue / max * 100 : 0}%`);
      price.style.setProperty('--range-max', `${max ? maxValue / max * 100 : 100}%`);
    }
    schedule(wait) {
      clearTimeout(this.timer);
      // Invalidate the old response before the debounce interval begins.
      this.request?.abort();
      this.removeAttribute('aria-busy');
      this.sequence++;
      this.timer = setTimeout(() => this.submit(), wait);
    }
    submit() {
      const form = this.querySelector('[data-collection-form]');
      if (!form || !form.reportValidity()) return;
      const url = new URL(location.href);
      [...url.searchParams.keys()].forEach(key => {
        if (key.startsWith('filter.') || key === 'sort_by' || key === 'page' || key.startsWith('page_') || key === 'section_id') url.searchParams.delete(key);
      });
      new FormData(form).forEach((value, key) => { if (value !== '') url.searchParams.append(key, value); });
      this.navigate(url);
    }
    cacheKey(url) {
      const key = new URL(url);
      key.searchParams.delete('section_id');
      return key.pathname + key.search;
    }
    collectionEvent(url) {
      // Match the existing facets.js Standard Events mapping without loading its UI controller.
      const filters = [], price = {};
      url.searchParams.forEach((value, key) => {
        if (key === 'filter.v.price.gte') price.min = Number(value);
        else if (key === 'filter.v.price.lte') price.max = Number(value);
        else if (key === 'filter.v.availability') filters.push({ available: value === '1' });
        else if (key === 'filter.p.vendor') filters.push({ productVendor: value });
        else if (key === 'filter.p.product_type') filters.push({ productType: value });
        else if (key === 'filter.p.tag') filters.push({ tag: value });
        else if (key.startsWith('filter.p.m.') || key.startsWith('filter.v.m.')) {
          const parts = key.split('.');
          if (parts.length >= 5) filters.push({ productMetafield: { namespace: parts[3], key: parts[4], value } });
        }
      });
      if (Object.keys(price).length) filters.push({ price });
      const sortKeys = { manual: 'MANUAL', 'best-selling': 'BEST_SELLING', 'title-ascending': 'TITLE', 'title-descending': 'TITLE', 'price-ascending': 'PRICE', 'price-descending': 'PRICE', 'created-ascending': 'CREATED', 'created-descending': 'CREATED', relevance: 'RELEVANCE' };
      return window.MaximizeStorefrontEvents?.createCollectionUpdate({
        collection: { id: null, handle: this.dataset.collectionHandle, productsCount: Number(this.dataset.productCount) },
        filters, sort: sortKeys[url.searchParams.get('sort_by')] || 'COLLECTION_DEFAULT'
      }, this);
    }
    async navigate(url, options = {}) {
      clearTimeout(this.timer);
      const token = ++this.sequence;
      this.request?.abort();
      this.request = new AbortController();
      this.failedURL = url;
      this.failedOptions = options;
      const error = this.querySelector('.maxbuy-collection__error');
      error.hidden = true;
      this.setAttribute('aria-busy', 'true');
      const updateEvent = this.collectionEvent(url);
      try {
        const key = this.cacheKey(url);
        let html = this.cache.get(key);
        if (!html) {
          const endpoint = new URL(url);
          endpoint.searchParams.set('section_id', this.dataset.sectionId);
          const response = await fetch(endpoint, { signal: this.request.signal, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
          if (!response.ok) throw new Error(`Collection HTTP ${response.status}`);
          const documentHTML = new DOMParser().parseFromString(await response.text(), 'text/html');
          const section = documentHTML.getElementById(this.id);
          const results = section?.querySelector('[data-collection-results]');
          if (!results) throw new Error('Collection section missing');
          html = results.innerHTML;
          if (this.cache.size >= 12) this.cache.delete(this.cache.keys().next().value);
          this.cache.set(key, html);
        }
        if (token !== this.sequence || !this.isConnected) { updateEvent?.reject(new DOMException('Superseded collection request', 'AbortError')); return; }
        const modalOpen = !!this.dialog?.matches(':modal');
        const panelScroll = this.dialog?.scrollTop || 0;
        const focusedID = this.contains(document.activeElement) ? document.activeElement.id : '';
        const opened = new Map([...this.querySelectorAll('[data-filter-key]')].map(details => [details.dataset.filterKey, details.dataset.motionTarget ? details.dataset.motionTarget === 'open' : details.open]));
        this.animations.forEach(animation => animation.cancel());
        this.animations.clear();
        this.replacing = true;
        this.closingPanel = false;
        this.dialog?.close();
        this.results.innerHTML = html;
        this.initContent();
        this.querySelectorAll('[data-filter-key]').forEach(details => {
          if (opened.has(details.dataset.filterKey)) details.open = opened.get(details.dataset.filterKey);
        });
        if (modalOpen && !this.media.matches) {
          this.openPanel(false);
          this.dialog.scrollTop = panelScroll;
        }
        this.replacing = false;
        if (!modalOpen) this.unlockBody();
        if (options.history !== false && key !== this.cacheKey(new URL(location.href))) history.pushState({ maxbuyCollection: true }, '', key);
        const heading = this.querySelector('h1');
        if (options.scroll) heading.scrollIntoView({ behavior: this.duration ? 'smooth' : 'instant', block: 'start' });
        if (options.focusHeading) heading.focus({ preventScroll: true });
        else if (focusedID) {
          const nextFocus = document.getElementById(focusedID);
          if (nextFocus && this.contains(nextFocus)) nextFocus.focus({ preventScroll: true });
        }
        updateEvent?.resolve(Number(this.querySelector('[data-result-count]')?.dataset.count));
        this.querySelector('[data-collection-status]').textContent = this.querySelector('[data-result-count]')?.textContent || '';
        if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger();
        this.dispatchEvent(new CustomEvent('maxbuy:collection:updated', { bubbles: true }));
      } catch (failure) {
        updateEvent?.reject(failure);
        if (failure.name !== 'AbortError' && token === this.sequence) {
          error.hidden = false;
          this.querySelector('[data-collection-reload]').href = url.href;
          // Keep an error actionable while the modal makes the background inert.
          if (this.dialog?.matches(':modal')) await this.closePanel(false);
        }
      } finally {
        if (token === this.sequence) this.removeAttribute('aria-busy');
      }
    }
  }
  customElements.define('maxbuy-collection', MaxbuyCollection);
})();
