if (!customElements.get('dual-hero')) {
  customElements.define('dual-hero', class extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      this.instances = [];
      this.start();
    }

    start() {
      if (!this.isConnected) return;
      if (typeof SwiffySlider === 'undefined') {
        this.startTimer = setTimeout(() => this.start(), 50);
        return;
      }
      // Reuse the theme's slider core with scoped, abortable listeners. The
      // xSwiffy store does not return an instance or expose a destroy method.
      class HeroSlider extends SwiffySlider {
        initEvents() {
          this.controller = new AbortController();
          this.options = { signal: this.controller.signal };
          this.isBanner = this.sliderElement.dataset.carousel === 'banners';
          this.buttons = [...this.sliderElement.querySelectorAll('[data-direction]')];
          this.dots = [...this.sliderElement.querySelectorAll('[data-slide]')];
          this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
          this.applyBreakpointOptions();
          this.buttons.forEach(button => button.addEventListener('click', () => {
            this.go((this.intentIndex ?? this.nearest()) + Number(button.dataset.direction));
          }, this.options));
          this.dots.forEach(dot => dot.addEventListener('click', () => this.go(Number(dot.dataset.slide)), this.options));
          this.container.addEventListener('scroll', () => this.sync(), { ...this.options, passive: true });
          this.container.addEventListener('scrollend', () => { this.intentIndex = null; this.sync(); }, this.options);
          this.container.addEventListener('keydown', event => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            const forward = event.key === (window.Maximize.rtl ? 'ArrowLeft' : 'ArrowRight');
            this.go((this.intentIndex ?? this.nearest()) + (forward ? 1 : -1));
          }, this.options);
          this.container.addEventListener('dragstart', event => event.preventDefault(), this.options);
          this.container.addEventListener('pointerdown', () => { this.intentIndex = null; }, { ...this.options, passive: true });
          this.observer = new ResizeObserver(() => {
            this.applyBreakpointOptions();
            this.go(this.activeSlideIndex, 'instant');
          });
          this.observer.observe(this.container);
          this.sync();
        }

        nearest() {
          const edge = this.container.getBoundingClientRect();
          const distance = slide => {
            const rect = slide.getBoundingClientRect();
            return Math.abs(window.Maximize.rtl ? rect.right - edge.right : rect.left - edge.left);
          };
          return [...this.slides].reduce((nearest, slide, index) => distance(slide) < distance(this.slides[nearest]) ? index : nearest, 0);
        }

        go(index, behavior) {
          index = Math.max(0, Math.min(this.slides.length - 1, index));
          this.intentIndex = index;
          clearTimeout(this.intentTimer);
          if (this.isBanner && !behavior) {
            this.sliderElement.classList.toggle('slider-nav-nodelay', this.motion.matches);
            super.slideTo(index);
          } else {
            const rect = this.slides[index].getBoundingClientRect();
            const edge = this.container.getBoundingClientRect();
            const delta = window.Maximize.rtl ? rect.right - edge.right : rect.left - edge.left;
            this.container.scrollBy({ left: delta, behavior: behavior || (this.motion.matches ? 'instant' : 'smooth') });
          }
          this.intentTimer = setTimeout(() => { this.intentIndex = null; this.sync(); }, 700);
          this.sync();
        }

        sync() {
          const index = this.nearest();
          this.updateActiveSlide(index);
          const position = Math.abs(this.container.scrollLeft);
          const maximum = this.container.scrollWidth - this.container.clientWidth;
          this.buttons.forEach(button => {
            button.hidden = maximum <= 1;
            button.disabled = Number(button.dataset.direction) < 0 ? position <= 1 : position >= maximum - 1;
          });
          this.dots.forEach((dot, dotIndex) => {
            if (dotIndex === index) dot.setAttribute('aria-current', 'true');
            else dot.removeAttribute('aria-current');
          });
          if (this.isBanner) this.slides.forEach((slide, slideIndex) => { slide.inert = slideIndex !== index; });
        }

        destroy() {
          this.controller.abort();
          this.observer.disconnect();
          clearTimeout(this.intentTimer);
          if (this.rafId) cancelAnimationFrame(this.rafId);
        }
      }

      this.querySelectorAll('[data-carousel]').forEach(root => {
        if (!root.querySelector('.slide-item')) return;
        this.instances.push(new HeroSlider(root, {
          effect: 'slide', isLoop: false, autoPlay: false, mediaQuery: 'min',
          breakPoints: { 0: { slidesPerView: 1, slidesPerMove: 1 }, 768: { slidesPerView: 1, slidesPerMove: 1 } }
        }));
      });
      this.banner = this.instances.find(instance => instance.isBanner);
      const options = { signal: this.controller.signal };
      this.addEventListener('shopify:block:select', event => {
        this.stopAutoplay(true);
        const instance = this.instances.find(slider => slider.sliderElement.contains(event.target));
        if (!instance) return;
        const slide = event.target.closest('.slide-item');
        const index = [...instance.slides].indexOf(slide);
        if (index >= 0) instance.go(index, 'instant');
      }, options);
      this.addEventListener('mouseenter', () => { this.hovered = true; this.stopAutoplay(); }, options);
      this.addEventListener('mouseleave', () => { this.hovered = false; this.scheduleAutoplay(); }, options);
      this.addEventListener('focusin', () => this.stopAutoplay(), options);
      this.addEventListener('focusout', () => queueMicrotask(() => {
        if (this.isConnected) this.scheduleAutoplay();
      }), options);
      this.addEventListener('pointerdown', () => this.stopAutoplay(true), { ...options, passive: true });
      this.addEventListener('keydown', () => this.stopAutoplay(true), options);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.stopAutoplay();
        else this.scheduleAutoplay();
      }, options);
      this.banner?.motion.addEventListener('change', () => {
        this.stopAutoplay();
        this.scheduleAutoplay();
      }, options);
      this.scheduleAutoplay();
    }

    stopAutoplay(permanent = false) {
      clearTimeout(this.autoplayTimer);
      if (permanent) {
        this.userStopped = true;
      }
    }

    scheduleAutoplay() {
      clearTimeout(this.autoplayTimer);
      const delay = Number(this.dataset.autoplay) * 1000;
      if (!delay || !this.banner || this.banner.slides.length < 2 || this.userStopped || this.hovered || document.hidden || this.contains(document.activeElement) || this.banner.motion.matches) return;
      if (this.banner.nearest() >= this.banner.slides.length - 1) return;
      this.autoplayTimer = setTimeout(() => {
        this.banner.go(this.banner.nearest() + 1);
        this.scheduleAutoplay();
      }, delay);
    }

    disconnectedCallback() {
      clearTimeout(this.startTimer);
      clearTimeout(this.autoplayTimer);
      this.instances.forEach(instance => instance.destroy());
      this.controller?.abort();
      this.controller = null;
    }
  });
}
