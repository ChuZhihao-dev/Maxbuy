(() => {
  const menuSelector = '[data-maxbuy-mega-menu]';
  const sectionId = 'maxbuy-mega-products';

  function init(menu) {
    if (menu.dataset.initialized === 'true') return;
    menu.dataset.initialized = 'true';

    const header = menu.closest('.section-header');
    const menuItem = menu.closest('.menu-item');
    const trigger = menuItem?.querySelector('[data-maxbuy-mega-trigger]');
    const products = menu.querySelector('[data-maxbuy-mega-products]');
    const viewMore = menu.querySelector('[data-maxbuy-mega-view-more]');
    const parents = Array.from(menu.querySelectorAll('[data-maxbuy-mega-parent]'));
    const groups = Array.from(menu.querySelectorAll('[data-maxbuy-mega-group]'));
    if (!header || !trigger || !products || !viewMore || !parents.length) return;

    const listeners = new AbortController();
    const cache = new Map();
    let productRequest;
    let selectedParent = -1;
    let selectedChild;
    let closeAnimationTimer;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function updateTop() {
      const bottom = header.getBoundingClientRect().bottom;
      menu.style.setProperty('--maxbuy-mega-top', `${Math.max(0, bottom)}px`);
    }

    function close() {
      if (menu.hidden) return;
      clearTimeout(closeAnimationTimer);
      menu.classList.remove('is-open');
      menu.setAttribute('inert', '');
      trigger.setAttribute('aria-expanded', 'false');
      productRequest?.abort();
      selectedChild = undefined;
      if (reducedMotion.matches) menu.hidden = true;
      else closeAnimationTimer = setTimeout(() => { menu.hidden = true; }, 260);
    }

    function setProducts(markup) {
      products.innerHTML = markup;
    }

    async function selectChild(child) {
      if (!child || selectedChild === child) return;
      selectedChild = child;
      menu.querySelectorAll('[data-maxbuy-mega-child]').forEach((link) => {
        const active = link === child;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });

      const destination = new URL(child.href, window.location.href);
      viewMore.href = destination.href;
      viewMore.hidden = child.getAttribute('href') === '#';
      productRequest?.abort();

      if (child.dataset.collection !== 'true' || destination.origin !== window.location.origin) {
        setProducts('');
        return;
      }

      const key = destination.pathname + destination.search;
      if (cache.has(key)) {
        setProducts(cache.get(key));
        return;
      }

      const controller = new AbortController();
      productRequest = controller;
      setProducts('<p class="maxbuy-mega-menu__loading">Loading products…</p>');
      destination.searchParams.set('section_id', sectionId);

      try {
        const response = await fetch(destination, {
          signal: controller.signal,
          headers: { 'Accept': 'text/html' }
        });
        if (!response.ok) throw new Error(`Section request failed: ${response.status}`);
        const documentHtml = new DOMParser().parseFromString(await response.text(), 'text/html');
        const fragment = documentHtml.querySelector('[data-maxbuy-mega-products-fragment]');
        if (!fragment) throw new Error('Product section was not returned');
        cache.set(key, fragment.innerHTML);
        if (selectedChild === child && !controller.signal.aborted) setProducts(fragment.innerHTML);
      } catch (error) {
        if (error.name !== 'AbortError' && selectedChild === child) {
          setProducts('<p class="maxbuy-mega-menu__empty">Products are unavailable right now.</p>');
        }
      }
    }

    function selectParent(index) {
      if (index === selectedParent || !groups[index]) return;
      selectedParent = index;
      parents.forEach((parent, parentIndex) => {
        const active = parentIndex === index;
        parent.classList.toggle('is-active', active);
        if (active) parent.setAttribute('aria-current', 'true');
        else parent.removeAttribute('aria-current');
      });
      groups.forEach((group, groupIndex) => { group.hidden = groupIndex !== index; });
      selectedChild = undefined;
      selectChild(groups[index].querySelector('[data-maxbuy-mega-child]'));
    }

    function open() {
      if (window.innerWidth < 1024) return;
      clearTimeout(closeAnimationTimer);
      updateTop();
      menu.hidden = false;
      menu.removeAttribute('inert');
      menu.getBoundingClientRect();
      menu.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      if (selectedParent < 0) selectParent(0);
      else selectChild(groups[selectedParent]?.querySelector('.is-active[data-maxbuy-mega-child], [data-maxbuy-mega-child]'));
    }

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (menu.hidden) open();
      else if (event.pointerType === 'touch' || event.detail === 0) close();
    }, { signal: listeners.signal });

    trigger.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'touch') open();
    }, { signal: listeners.signal });

    header.addEventListener('pointerleave', (event) => {
      if (!menu.contains(event.relatedTarget)) close();
    }, { signal: listeners.signal });

    header.addEventListener('pointerover', (event) => {
      const hoveredItem = event.target.closest('.main-menu-item');
      if (hoveredItem && hoveredItem !== menuItem) close();
    }, { signal: listeners.signal });

    menu.addEventListener('pointerover', (event) => {
      if (event.pointerType === 'touch') return;
      const parent = event.target.closest('[data-maxbuy-mega-parent]');
      if (parent) selectParent(Number(parent.dataset.maxbuyMegaParent));
      const child = event.target.closest('[data-maxbuy-mega-child]');
      if (child) selectChild(child);
    }, { signal: listeners.signal });

    menu.addEventListener('focusin', (event) => {
      const parent = event.target.closest('[data-maxbuy-mega-parent]');
      if (parent) selectParent(Number(parent.dataset.maxbuyMegaParent));
      const child = event.target.closest('[data-maxbuy-mega-child]');
      if (child) selectChild(child);
    }, { signal: listeners.signal });

    document.addEventListener('pointerdown', (event) => {
      if (!menu.contains(event.target) && !trigger.contains(event.target)) close();
    }, { signal: listeners.signal });

    document.addEventListener('focusin', (event) => {
      if (!menu.hidden && !menu.contains(event.target) && !trigger.contains(event.target)) close();
    }, { signal: listeners.signal });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.hidden) {
        close();
        trigger.focus();
      }
    }, { signal: listeners.signal });

    window.addEventListener('resize', () => {
      if (window.innerWidth < 1024) close();
      else if (!menu.hidden) updateTop();
    }, { signal: listeners.signal });

    window.addEventListener('scroll', () => {
      if (!menu.hidden) close();
    }, { passive: true, signal: listeners.signal });

    document.addEventListener('shopify:section:unload', (event) => {
      if (event.target !== header) return;
      listeners.abort();
      productRequest?.abort();
      menu.dataset.initialized = '';
    }, { signal: listeners.signal });
  }

  function initAll(root = document) {
    root.querySelectorAll(menuSelector).forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll(), { once: true });
  } else {
    initAll();
  }
  document.addEventListener('shopify:section:load', (event) => initAll(event.target));
})();
