(() => {
  const selector = '[data-product-section-nav]';
  const productSelector = '.section-product-description-overview';
  const recommendationSelector = '.section-product-recommendations';

  function init(nav) {
    if (nav.dataset.initialized) return;
    nav.dataset.initialized = 'true';

    const section = nav.closest('.section-product-section-nav');
    const links = Array.from(nav.querySelectorAll('[data-product-nav-target]'));
    const observedSections = new WeakSet();
    let activeTargets = [];
    let queued = false;

    function resolveTargets() {
      const description = document.querySelector(productSelector);
      const specificationHeading = Array.from(description?.querySelectorAll('[data-description-content] h2, [data-description-content] h3, [data-description-content] h4, [data-description-content] h5, [data-description-content] h6') || [])
        .find((heading) => /^(product\s+)?specifications$/i.test(heading.textContent.trim()));
      if (specificationHeading && !document.getElementById('product-specifications')) {
        specificationHeading.id = 'product-specifications';
      }

      const recommendations = document.querySelector(recommendationSelector);
      const recommendationHeading = recommendations?.querySelector('.product-recommendations h2, .product-recommendations h3');
      if (recommendationHeading && !document.getElementById('you-may-also-like')) {
        recommendationHeading.id = 'you-may-also-like';
      }

      activeTargets = links.map((link) => {
        const target = document.getElementById(link.dataset.productNavTarget);
        link.hidden = !target;
        return target ? { link, target } : null;
      }).filter(Boolean);
      nav.hidden = activeTargets.length === 0;
      section.hidden = activeTargets.length === 0;
      updateActive();
    }

    function headerHeight() {
      const header = document.querySelector('.section-header');
      if (!header) return 0;
      const rect = header.getBoundingClientRect();
      return rect.top <= 0 && rect.bottom > 0 ? rect.bottom : 0;
    }

    function offset() {
      return headerHeight() + section.getBoundingClientRect().height + 12;
    }

    function clickOffset(targetTop) {
      const header = document.querySelector('.section-header');
      const movingUp = targetTop < window.scrollY;
      const headerWillShow = movingUp && header && getComputedStyle(header).position === 'sticky';
      return (headerWillShow ? header.getBoundingClientRect().height : 0) + section.getBoundingClientRect().height + 12;
    }

    function updateActive() {
      section.style.setProperty('--product-section-nav-top', `${headerHeight()}px`);
      const position = window.scrollY + offset() + 16;
      let current = activeTargets[0];
      for (const item of activeTargets) {
        if (item.target.getBoundingClientRect().top + window.scrollY <= position) current = item;
      }
      for (const item of activeTargets) {
        if (item === current) item.link.setAttribute('aria-current', 'location');
        else item.link.removeAttribute('aria-current');
      }
    }

    function scheduleUpdate() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        updateActive();
      });
    }

    nav.addEventListener('click', (event) => {
      const link = event.target.closest('a[data-product-nav-target]');
      if (!link || link.hidden) return;
      const target = document.getElementById(link.dataset.productNavTarget);
      if (!target) return;
      event.preventDefault();
      history.replaceState(null, '', link.hash);
      const targetTop = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: Math.max(0, targetTop - clickOffset(targetTop)),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
      });
      link.focus({ preventScroll: true });
      scheduleUpdate();
    });

    const observer = new MutationObserver(resolveTargets);
    function observeDynamicSections() {
      document.querySelectorAll(`${productSelector}, ${recommendationSelector}`).forEach((targetSection) => {
        if (observedSections.has(targetSection)) return;
        observedSections.add(targetSection);
        observer.observe(targetSection, { childList: true, subtree: true });
      });
    }
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    document.addEventListener('shopify:section:load', () => {
      observeDynamicSections();
      resolveTargets();
    });
    observeDynamicSections();
    resolveTargets();
  }

  function initAll() {
    document.querySelectorAll(selector).forEach(init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll, { once: true });
  else initAll();
  document.addEventListener('shopify:section:load', initAll);
})();
