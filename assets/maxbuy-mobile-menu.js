(() => {
  const cache = new Map();
  const levelId = 'maxbuy-mobile-products';

  function init(drawer) {
    if (drawer.dataset.mobileProductsInitialized) return;
    const panel = drawer.querySelector('[data-maxbuy-mobile-products]');
    const firstLevel = drawer.querySelector('#menu-level-0')?.parentElement;
    if (!panel || !firstLevel) return;
    drawer.dataset.mobileProductsInitialized = 'true';
    const listeners = new AbortController();
    const results = panel.querySelector('[data-maxbuy-mobile-results]');
    const backButton = panel.querySelector('[data-maxbuy-mobile-back]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const heightAnimations = new Map();
    firstLevel.classList.add('maxbuy-mobile-menu__first-level');
    let request;
    let returnLink;
    let savedScroll = 0;
    let phase = 'closed';
    let closeTimer;

    function animateHeight(element, from, to, complete) {
      heightAnimations.get(element)?.animation.cancel();
      if (reducedMotion.matches || !element.animate) {
        element.style.height = '';
        element.style.overflow = '';
        complete?.();
        heightAnimations.delete(element);
        return;
      }
      element.style.height = `${from}px`;
      element.style.overflow = 'hidden';
      const animation = element.animate({ height: [`${from}px`, `${to}px`] }, {
        duration: 260, easing: 'cubic-bezier(.22, .68, 0, 1)'
      });
      const finish = () => {
        element.style.height = '';
        element.style.overflow = '';
        heightAnimations.delete(element);
        complete?.();
      };
      heightAnimations.set(element, { animation, finish });
      animation.onfinish = finish;
    }

    function toggleDetails(details) {
      // A nested accordion can be activated while its parent is still expanding.
      // Finish that parent first so it doesn't retain an outdated target height.
      let ancestor = details.parentElement?.closest('details');
      while (ancestor && drawer.contains(ancestor)) {
        if (ancestor.dataset.motionTarget === 'closed') return;
        const pending = heightAnimations.get(ancestor);
        if (pending) { pending.animation.cancel(); pending.finish(); }
        ancestor = ancestor.parentElement?.closest('details');
      }
      const from = details.getBoundingClientRect().height;
      const expand = details.dataset.motionTarget ? details.dataset.motionTarget === 'closed' : !details.open;
      heightAnimations.get(details)?.animation.cancel();
      details.style.height = '';
      details.open = true;
      details.dataset.motionTarget = expand ? 'open' : 'closed';
      details.toggleAttribute('data-collapsing', !expand);
      const to = expand ? details.getBoundingClientRect().height : details.querySelector(':scope > summary').offsetHeight;
      animateHeight(details, from, to, () => {
        details.open = expand;
        delete details.dataset.motionTarget;
        details.removeAttribute('data-collapsing');
      });
    }

    function toggleBrands(button) {
      const brands = button.closest('[data-maxbuy-mobile-brands]');
      const grid = brands.querySelector('.maxbuy-mobile-menu__brand-grid');
      const expand = button.getAttribute('aria-expanded') !== 'true';
      const from = grid.getBoundingClientRect().height;
      heightAnimations.get(grid)?.animation.cancel();
      grid.style.height = '';
      brands.querySelectorAll('[data-maxbuy-extra-brand]').forEach((item) => { item.hidden = !expand; });
      button.setAttribute('aria-expanded', String(expand));
      button.querySelector('span').textContent = expand ? 'View Less' : 'View More';
      animateHeight(grid, from, grid.getBoundingClientRect().height);
    }

    function finishBack(restoreFocus) {
      clearTimeout(closeTimer);
      phase = 'closed';
      panel.classList.remove('is-open');
      firstLevel.classList.remove('is-behind');
      panel.hidden = true;
      panel.inert = true;
      firstLevel.inert = false;
      window.Alpine?.store('xMobileNav').removeActiveLink(levelId);
      firstLevel.scrollTop = savedScroll;
      if (restoreFocus && returnLink?.isConnected) returnLink.focus({ preventScroll: true });
    }

    function back(restoreFocus = true) {
      if (phase === 'closed') return;
      request?.abort();
      if (!restoreFocus || reducedMotion.matches) {
        finishBack(restoreFocus);
        return;
      }
      if (phase === 'closing') return;
      phase = 'closing';
      panel.inert = true;
      panel.classList.remove('is-open');
      firstLevel.classList.remove('is-behind');
      // Keep both layers mounted until the return transition has finished.
      closeTimer = setTimeout(() => finishBack(true), 360);
    }

    async function open(link) {
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || innerWidth >= 1024) return;
      request?.abort();
      clearTimeout(closeTimer);
      returnLink = link;
      if (phase === 'closed') savedScroll = firstLevel.scrollTop;
      panel.querySelector('[data-maxbuy-mobile-title]').textContent = link.dataset.title;
      const count = Number(link.dataset.count || 0);
      panel.querySelector('[data-maxbuy-mobile-count]').textContent = `(${count} ${count === 1 ? 'Item' : 'Items'})`;
      panel.querySelector('[data-maxbuy-mobile-view-more]').href = url.href;
      panel.hidden = false;
      panel.inert = false;
      firstLevel.inert = true;
      if (phase === 'closed') window.Alpine?.store('xMobileNav').setActiveLink(levelId);
      phase = 'open';
      panel.scrollTop = 0;
      panel.getBoundingClientRect();
      panel.classList.add('is-open');
      firstLevel.classList.add('is-behind');
      backButton.focus({ preventScroll: true });
      const key = url.pathname + url.search;
      if (cache.has(key)) {
        results.innerHTML = cache.get(key);
        results.setAttribute('aria-busy', 'false');
        return;
      }
      const controller = new AbortController();
      request = controller;
      results.textContent = 'Loading products…';
      results.setAttribute('aria-busy', 'true');
      url.searchParams.set('section_id', 'maxbuy-mobile-products');
      try {
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'text/html' } });
        if (!response.ok) throw new Error('Collection request failed');
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const fragment = doc.querySelector('[data-maxbuy-mobile-products-fragment]');
        if (!fragment) throw new Error('Product section missing');
        if (controller.signal.aborted) return;
        cache.set(key, fragment.innerHTML);
        results.innerHTML = fragment.innerHTML;
      } catch (error) {
        if (error.name !== 'AbortError') results.textContent = 'Products are unavailable right now. Use View More to open the collection.';
      } finally {
        if (!controller.signal.aborted) results.setAttribute('aria-busy', 'false');
      }
    }

    drawer.addEventListener('click', (event) => {
      const summary = event.target.closest('summary');
      if (summary?.parentElement.matches('.maxbuy-mobile-menu__section, .maxbuy-mobile-menu__category')) {
        event.preventDefault();
        toggleDetails(summary.parentElement);
        return;
      }
      const brandsToggle = event.target.closest('[data-maxbuy-mobile-brands-toggle]');
      if (brandsToggle) {
        toggleBrands(brandsToggle);
        return;
      }
      const link = event.target.closest('[data-maxbuy-mobile-collection]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || innerWidth >= 1024) return;
      if (new URL(link.href, location.href).origin !== location.origin) return;
      event.preventDefault();
      open(link);
    }, { signal: listeners.signal });
    backButton.addEventListener('click', () => back(), { signal: listeners.signal });
    panel.addEventListener('transitionend', (event) => {
      if (event.target === panel && event.propertyName === 'transform' && phase === 'closing') finishBack(true);
    }, { signal: listeners.signal });
    drawer.addEventListener('keydown', (event) => {
      if (event.key === 'Tab' && !panel.hidden) {
        const focusable = [...panel.querySelectorAll('button, a[href]')].filter((element) => element.getClientRects().length);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && event.target === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && event.target === last) {
          event.preventDefault();
          first?.focus();
        }
      }
      if (event.key !== 'Escape' || panel.hidden) return;
      event.preventDefault();
      event.stopPropagation();
      back();
    }, { capture: true, signal: listeners.signal });
    const observer = new MutationObserver(() => {
      if (!drawer.classList.contains('active')) back(false);
    });
    observer.observe(drawer, { attributes: true, attributeFilter: ['class'] });
    reducedMotion.addEventListener('change', () => {
      if (!reducedMotion.matches) return;
      heightAnimations.forEach(({ animation, finish }) => { animation.cancel(); finish(); });
      if (phase === 'closing') finishBack(true);
    }, { signal: listeners.signal });
    window.addEventListener('resize', () => { if (innerWidth >= 1024) back(false); }, { signal: listeners.signal });
    document.addEventListener('shopify:section:unload', (event) => {
      if (!event.target.contains(drawer)) return;
      back(false);
      clearTimeout(closeTimer);
      heightAnimations.forEach(({ animation, finish }) => { animation.cancel(); finish(); });
      observer.disconnect();
      listeners.abort();
      delete drawer.dataset.mobileProductsInitialized;
    }, { signal: listeners.signal });
  }

  function initAll(root = document) { root.querySelectorAll('.maxbuy-mobile-nav').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initAll(), { once: true });
  else initAll();
  document.addEventListener('shopify:section:load', (event) => initAll(event.target));
})();
