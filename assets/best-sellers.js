if (!customElements.get('best-sellers-carousel')) {
  customElements.define('best-sellers-carousel', class extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      this.track = this.querySelector('.best-sellers__track');
      this.cards = [...this.querySelectorAll('.best-sellers__card')];
      this.media = window.matchMedia('(min-width: 768px)');
      this.desktopMedia = window.matchMedia('(min-width: 1200px)');
      const root = this.closest('custom-collections');
      const labels = [...root.querySelectorAll('.collection-title')];
      const updateLabels = () => labels.forEach(button => button.setAttribute('aria-pressed', String(button.classList.contains('is-active'))));
      this.tabObserver = new MutationObserver(updateLabels);
      labels.forEach(button => this.tabObserver.observe(button, { attributes: true, attributeFilter: ['class'] }));
      updateLabels();
      const build = () => {
        const previous = this.pages?.[this.nearest()]?.querySelector('.best-sellers__card');
        const first = Math.max(0, this.cards.indexOf(previous));
        const desktopColumns = Number(this.dataset.desktopColumns) || 4;
        const columns = this.media.matches ? (this.desktopMedia.matches ? desktopColumns : Math.min(3, desktopColumns)) : (Number(this.dataset.mobileColumns) || 2);
        const rows = Number(this.media.matches ? this.dataset.desktopRows : this.dataset.mobileRows) || (this.media.matches ? 2 : 3);
        const count = columns * rows;
        const fragment = document.createDocumentFragment();
        this.pages = [];
        this.cards.forEach((card, index) => {
          if (index % count === 0) {
            const page = document.createElement('div');
            page.className = 'best-sellers__page';
            page.style.setProperty('--best-sellers-columns', columns);
            fragment.append(page);
            this.pages.push(page);
          }
          this.pages[this.pages.length - 1].append(card);
        });
        this.track.replaceChildren(fragment);
        this.classList.add('is-ready');
        const index = Math.floor(first / count);
        requestAnimationFrame(() => {
          if (!this.isConnected) return;
          this.go(index, 'instant');
        });
      };
      this.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => {
        this.go((this.targetIndex ?? this.nearest()) + Number(button.dataset.direction));
      }, options));
      this.track.addEventListener('scroll', () => this.update(), { ...options, passive: true });
      this.track.addEventListener('scrollend', () => { this.targetIndex = null; this.update(); }, options);
      this.track.addEventListener('pointerdown', () => { this.targetIndex = null; }, { ...options, passive: true });
      this.track.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const rtl = getComputedStyle(this.track).direction === 'rtl';
        this.go(this.nearest() + (event.key === (rtl ? 'ArrowLeft' : 'ArrowRight') ? 1 : -1));
      }, options);
      this.media.addEventListener('change', build, options);
      this.desktopMedia.addEventListener('change', build, options);
      build();
      this.observer = new ResizeObserver(() => this.go(this.targetIndex ?? this.nearest(), 'instant'));
      this.observer.observe(this.track);
    }
    nearest() {
      const edge = this.track.getBoundingClientRect();
      const rtl = getComputedStyle(this.track).direction === 'rtl';
      const distance = page => Math.abs(page.getBoundingClientRect()[rtl ? 'right' : 'left'] - edge[rtl ? 'right' : 'left']);
      return (this.pages || []).reduce((nearest, page, index, list) => distance(page) < distance(list[nearest]) ? index : nearest, 0);
    }
    go(index, behavior) {
      index = Math.max(0, Math.min(this.pages.length - 1, index));
      if (!this.pages[index]) return;
      const rtl = getComputedStyle(this.track).direction === 'rtl';
      const side = rtl ? 'right' : 'left';
      this.targetIndex = index;
      this.track.scrollBy({ left: this.pages[index].getBoundingClientRect()[side] - this.track.getBoundingClientRect()[side], behavior: behavior || (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth') });
      clearTimeout(this.timer);
      this.timer = setTimeout(() => { this.targetIndex = null; this.update(); }, 700);
      this.update();
    }
    update() {
      const position = Math.abs(this.track.scrollLeft);
      const maximum = this.track.scrollWidth - this.track.clientWidth;
      this.querySelectorAll('[data-direction]').forEach(button => { button.disabled = Number(button.dataset.direction) < 0 ? position <= 1 : position >= maximum - 1; });
      const active = this.nearest();
      this.pages.forEach((page, index) => { page.inert = index !== active; });
    }
    disconnectedCallback() {
      this.controller?.abort();
      this.observer?.disconnect();
      this.tabObserver?.disconnect();
      clearTimeout(this.timer);
    }
  });
}
