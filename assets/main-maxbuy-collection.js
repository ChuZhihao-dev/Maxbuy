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
      document.addEventListener('click', event => {
        const dropdown = this.querySelector('[data-sort-dropdown][open]');
        if (dropdown && !dropdown.contains(event.target)) dropdown.open = false;
      }, options);
      this.addEventListener('keydown', event => {
        const dropdown = event.target.closest('[data-sort-dropdown]');
        if (!dropdown) return;
        const trigger = dropdown.querySelector('summary');
        if (event.key === 'Escape') {
          event.preventDefault(); dropdown.open = false; trigger.focus(); return;
        }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); dropdown.open = true;
        const buttons = [...dropdown.querySelectorAll('[data-sort-option]')];
        const index = buttons.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowDown' ? (index + 1) % buttons.length : (index < 0 ? buttons.length - 1 : (index - 1 + buttons.length) % buttons.length);
        buttons[next]?.focus();
      }, options);
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
        location.reload();
      }, options);
      this.initContent();
      this.updateTitle();
      this.currentURL = this.dataset.independentSource === 'true'
        ? this.buildURL([], this.dataset.collectionUrl)
        : new URL(location.href);
      const savedURL = history.state?.maxbuyCollections?.[this.dataset.sectionId];
      const restoredURL = savedURL ? new URL(savedURL, location.href) : null;
      const canRestore = restoredURL?.origin === location.origin && (this.dataset.independentSource !== 'true' || restoredURL.pathname === this.currentURL.pathname);
      const pageHasCollectionState = [...new URL(location.href).searchParams.keys()].some(key => key.startsWith('filter.') || key === 'sort_by' || key === 'page' || key.startsWith('page_'));
      if (canRestore && this.independent) {
        this.navigate(restoredURL, { history: false });
      } else if (this.dataset.independentSource === 'true' && pageHasCollectionState) {
        this.navigate(this.currentURL, { history: false });
      } else {
        this.cache.set(this.cacheKey(this.currentURL), { html: this.results.innerHTML, handle: this.dataset.collectionHandle, count: this.dataset.productCount });
      }
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
    get independent() {
      return this.dataset.independentSource === 'true' || document.querySelectorAll('maxbuy-collection').length > 1;
    }
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
        if (this.dialog.matches(':modal')) { this.discardDraft(); this.dialog.close(); }
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
    updateTitle() {
      if (this.independent) return;
      const title = this.querySelector('[data-document-title]')?.dataset.documentTitle;
      if (title) document.title = title;
    }
    discardDraft() {
      this.querySelector('[data-collection-form]')?.reset();
      this.querySelectorAll('[data-price-filter]').forEach(price => this.syncPrice(price));
    }
    openPanel(animate = true) {
      if (!this.dialog || this.media.matches) return;
      this.discardDraft();
      if (!this.dialog.open) this.dialog.showModal();
      this.lockBody();
      this.querySelector('[data-filters-open]')?.setAttribute('aria-expanded', 'true');
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
      this.discardDraft();
      this.querySelector('[data-filters-open]')?.setAttribute('aria-expanded', 'false');
      this.querySelector('[data-filters-open]')?.focus({ preventScroll: true });
    }
    onClick(event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const sortOption = target.closest('[data-sort-option]');
      if (sortOption) {
        const select = this.querySelector('[data-collection-sort]');
        const dropdown = sortOption.closest('[data-sort-dropdown]');
        const changed = select.value !== sortOption.dataset.sortOption;
        select.value = sortOption.dataset.sortOption;
        dropdown.querySelector('[data-sort-value]').textContent = sortOption.querySelector('span').textContent;
        dropdown.querySelectorAll('[data-sort-option]').forEach(button => button.setAttribute('aria-pressed', String(button === sortOption)));
        dropdown.open = false;
        dropdown.querySelector('summary').focus();
        if (changed) this.onChange({ target: select });
        return;
      }
      if (target.closest('[data-filters-open]')) { this.openPanel(); return; }
      if (target.closest('[data-filters-clear]') && !this.media.matches) {
        event.preventDefault();
        const form = this.querySelector('[data-collection-form]');
        form.querySelectorAll('input').forEach(input => {
          if (input.type === 'checkbox') input.checked = false;
          else if (input.name) input.value = '';
        });
        form.querySelectorAll('[data-price-filter]').forEach(price => this.syncPrice(price));
        return;
      }
      const reset = target.closest('[data-filter-reset]');
      if (reset) {
        const group = reset.closest('[data-filter-key]');
        group.querySelectorAll('input').forEach(input => {
          if (input.type === 'checkbox') input.checked = false;
          else if (input.name) input.value = '';
        });
        group.querySelectorAll('[data-price-filter]').forEach(price => this.syncPrice(price));
        if (this.media.matches) this.submit();
        return;
      }
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
      if (url.origin !== location.origin) return;
      if (this.dataset.independentSource === 'true') url.pathname = new URL(this.dataset.collectionUrl, location.href).pathname;
      const current = this.currentURL || new URL(location.href);
      current.searchParams.forEach((value, key) => {
        if (!key.startsWith('filter.') && !['sort_by', 'page', 'section_id', 'sections'].includes(key) && !key.startsWith('page_') && !url.searchParams.has(key)) url.searchParams.append(key, value);
      });
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
        if (target.matches('[data-price]') && this.media.matches) this.schedule(300);
      }
    }
    onChange(event) {
      if (event.target.matches('[data-collection-sort], [data-collection-form] input')) {
        if (event.target.closest('[data-price-filter]')) this.syncPrice(event.target.closest('[data-price-filter]'), event.target);
        if (this.media.matches || event.target.matches('[data-collection-sort]')) this.schedule(event.target.type === 'checkbox' ? 100 : 0);
      }
    }
    syncPrice(price, source) {
      const max = Number(price.dataset.rangeMax);
      const fields = { min: price.querySelector('[data-price="min"]'), max: price.querySelector('[data-price="max"]') };
      const ranges = { min: price.querySelector('[data-range="min"]'), max: price.querySelector('[data-range="max"]') };
      if (source?.dataset.range) fields[source.dataset.range].value = source.value;
      const minValue = fields.min.value === '' ? 0 : Number(fields.min.value);
      const maxValue = fields.max.value === '' ? max : Number(fields.max.value);
      const invalid = fields.min.validity.badInput || fields.max.validity.badInput || !Number.isFinite(minValue) || !Number.isFinite(maxValue) || minValue < 0 || maxValue < 0 || minValue > maxValue;
      fields.min.setCustomValidity(invalid ? this.dataset.priceError : '');
      fields.max.setCustomValidity(invalid ? this.dataset.priceError : '');
      ranges.min.value = Math.min(max, Math.max(0, minValue || 0));
      ranges.max.value = Math.min(max, Math.max(0, Number.isFinite(maxValue) ? maxValue : max));
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
    buildURL(entries, action) {
      const current = this.currentURL || new URL(location.href);
      const target = new URL(action, current);
      if (target.origin !== current.origin) throw new Error('Invalid collection target');
      // Preserve market/locale in the configured action and preview context from this page.
      target.search = current.search;
      [...target.searchParams.keys()].forEach(key => {
        if (key.startsWith('filter.') || key === 'sort_by' || key === 'page' || key.startsWith('page_') || key === 'section_id' || key === 'sections' || key.startsWith('sections[')) target.searchParams.delete(key);
      });
      const seen = new Set();
      for (const [key, value] of entries) {
        if (value === '' || (key !== 'sort_by' && !key.startsWith('filter.'))) continue;
        const pair = JSON.stringify([key, String(value)]);
        if (!seen.has(pair)) { target.searchParams.append(key, value); seen.add(pair); }
      }
      return target;
    }
    submit() {
      const form = this.querySelector('[data-collection-form]');
      if (!form || !form.reportValidity()) return;
      const url = this.buildURL(new FormData(form), form.action);
      if (this.dialog?.matches(':modal')) this.closePanel(false);
      this.navigate(url, { focusHeading: true });
    }
    cacheKey(url) {
      const key = new URL(url);
      key.searchParams.delete('section_id');
      key.searchParams.delete('sections');
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
      if (url.origin !== location.origin) return;
      if (url.pathname !== location.pathname && !this.independent) { location.assign(url.href); return; }
      url.searchParams.delete('section_id');
      url.searchParams.delete('sections');
      const token = ++this.sequence;
      this.request?.abort();
      this.request = new AbortController();
      this.failedURL = url;
      this.failedOptions = options;
      const error = this.querySelector('.maxbuy-collection__error');
      error.hidden = true;
      this.setAttribute('aria-busy', 'true');
      const updateEvent = this.collectionEvent(url);
      const request = this.request;
      const timeout = setTimeout(() => request.abort(new DOMException('Collection request timed out', 'TimeoutError')), 15000);
      try {
        const key = this.cacheKey(url);
        let content = this.cache.get(key);
        if (!content) {
          const endpoint = new URL(url);
          endpoint.searchParams.set('section_id', this.dataset.sectionId);
          const response = await fetch(endpoint, { signal: this.request.signal, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
          if (!response.ok) throw new Error(`Collection HTTP ${response.status}`);
          const documentHTML = new DOMParser().parseFromString(await response.text(), 'text/html');
          const section = documentHTML.getElementById(this.id);
          const results = section?.querySelector('[data-collection-results]');
          if (!results?.querySelector('[data-collection-heading]') || !results.querySelector('[data-collection-grid]') || !results.querySelector('[data-collection-form]')) throw new Error('Collection section missing');
          content = { html: results.innerHTML, handle: section.dataset.collectionHandle, count: section.dataset.productCount };
          if (this.cache.size >= 12) this.cache.delete(this.cache.keys().next().value);
          this.cache.set(key, content);
        }
        if (token !== this.sequence || !this.isConnected) { updateEvent?.reject(new DOMException('Superseded collection request', 'AbortError')); return; }
        const modalOpen = false;
        const panelScroll = this.dialog?.scrollTop || 0;
        const focusedID = this.contains(document.activeElement) ? document.activeElement.id : '';
        const opened = new Map([...this.querySelectorAll('[data-filter-key]')].map(details => [details.dataset.filterKey, details.dataset.motionTarget ? details.dataset.motionTarget === 'open' : details.open]));
        this.animations.forEach(animation => animation.cancel());
        this.animations.clear();
        this.replacing = true;
        this.closingPanel = false;
        this.dialog?.close();
        // Collection-context responses must keep the host Page's breadcrumbs and promotion.
        const pageIntro = this.dataset.pageContext === 'true' ? this.querySelector('.maxbuy-collection__intro')?.cloneNode(true) : null;
        this.results.innerHTML = content.html;
        if (pageIntro) this.querySelector('.maxbuy-collection__intro')?.replaceWith(pageIntro);
        this.dataset.collectionHandle = content.handle;
        this.dataset.productCount = content.count;
        this.currentURL = new URL(url);
        this.initContent();
        this.updateTitle();
        this.querySelectorAll('[data-filter-key]').forEach(details => {
          if (opened.has(details.dataset.filterKey)) details.open = opened.get(details.dataset.filterKey);
        });
        if (modalOpen && !this.media.matches) {
          this.openPanel(false);
          this.dialog.scrollTop = panelScroll;
        }
        this.replacing = false;
        if (!modalOpen) this.unlockBody();
        if (options.history !== false) {
          if (this.independent) {
            const state = history.state || {};
            const collections = { ...state.maxbuyCollections, [this.dataset.sectionId]: url.href };
            history.pushState({ ...state, maxbuyCollections: collections }, '', location.href);
          } else if (key !== this.cacheKey(new URL(location.href))) {
            history.pushState({ ...history.state, maxbuyCollection: true }, '', key);
          }
        }
        const heading = this.querySelector('[data-collection-heading]');
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
        if (token === this.sequence && (failure.name !== 'AbortError' || this.request.signal.reason?.name === 'TimeoutError')) {
          if (!this.independent) location.assign(url.href);
          error.hidden = false;
          this.querySelector('[data-collection-reload]').href = url.href;
          // Keep an error actionable while the modal makes the background inert.
          if (this.dialog?.matches(':modal')) await this.closePanel(false);
        }
      } finally {
        clearTimeout(timeout);
        if (token === this.sequence) this.removeAttribute('aria-busy');
      }
    }
  }
  customElements.define('maxbuy-collection', MaxbuyCollection);
})();
