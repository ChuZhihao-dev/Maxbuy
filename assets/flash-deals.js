if (!customElements.get('flash-deals')) {
  customElements.define('flash-deals', class extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      this.track = this.querySelector('.flash-deals__track');
      this.cards = [...this.track.querySelectorAll('.best-sellers__card')];
      this.buttons = [...this.querySelectorAll('[data-direction]')];
      this.rtl = getComputedStyle(this.track).direction === 'rtl';
      this.buttons.forEach(button => button.addEventListener('click', () => {
        const direction = Number(button.dataset.direction);
        const step = this.dataset.step === 'screen' ? Math.max(1, Math.floor((this.track.clientWidth + this.gap()) / this.step())) : 1;
        this.go((this.targetIndex ?? this.nearest()) + direction * step);
      }, options));
      this.track.addEventListener('scroll', () => this.update(), { ...options, passive: true });
      this.track.addEventListener('scrollend', () => { this.targetIndex = null; this.update(); }, options);
      this.track.addEventListener('pointerdown', () => { this.targetIndex = null; }, { ...options, passive: true });
      this.track.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        this.go((this.targetIndex ?? this.nearest()) + (event.key === (this.rtl ? 'ArrowLeft' : 'ArrowRight') ? 1 : -1));
      }, options);
      this.addEventListener('focusin', event => {
        const card = event.target.closest('.best-sellers__card');
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const edge = this.track.getBoundingClientRect();
        if (rect.left < edge.left || rect.right > edge.right) this.go(this.cards.indexOf(card));
      }, options);
      this.observer = new ResizeObserver(() => { this.targetIndex = null; this.update(); });
      this.observer.observe(this.track);
      this.update();
      this.startCountdown();
    }
    gap() { return parseFloat(getComputedStyle(this.track).columnGap) || 0; }
    step() { return (this.cards[0]?.getBoundingClientRect().width || this.track.clientWidth) + this.gap(); }
    nearest() {
      const position = Math.abs(this.track.scrollLeft);
      const maximum = Math.max(0, this.track.scrollWidth - this.track.clientWidth);
      return maximum > 0 && position >= maximum - 1 ? Math.ceil(maximum / this.step()) : Math.round(position / this.step());
    }
    go(index) {
      if (!this.cards.length) return;
      const maximum = Math.max(0, this.track.scrollWidth - this.track.clientWidth);
      const maxIndex = Math.ceil(maximum / this.step());
      index = Math.max(0, Math.min(maxIndex, index));
      this.targetIndex = index;
      this.track.scrollTo({ left: Math.min(maximum, index * this.step()) * (this.rtl ? -1 : 1), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      clearTimeout(this.targetTimer);
      this.targetTimer = setTimeout(() => { this.targetIndex = null; this.update(); }, 700);
    }
    update() {
      const position = Math.abs(this.track.scrollLeft);
      const maximum = Math.max(0, this.track.scrollWidth - this.track.clientWidth);
      this.buttons.forEach(button => { button.disabled = Number(button.dataset.direction) < 0 ? position <= 1 : position >= maximum - 1; });
      this.querySelector('.flash-deals__shade').hidden = position >= maximum - 1;
      const status = this.querySelector('[data-deals-status]');
      const text = this.cards.length ? `Product ${Math.min(this.cards.length, this.nearest() + 1)} of ${this.cards.length}` : '';
      if (status.textContent !== text) status.textContent = text;
    }
    startCountdown() {
      const timer = this.querySelector('.flash-deals__countdown');
      if (!timer || this.dataset.countdown !== 'true') return;
      const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(this.dataset.endDate);
      const time = /^(\d{2}):(\d{2})$/.exec(this.dataset.endTime);
      if (!date || !time) return;
      const [, year, month, day] = date.map(Number);
      const [, hour, minute] = time.map(Number);
      const check = new Date(Date.UTC(year, month - 1, day));
      if (year < 2000 || check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || hour > 23 || minute > 59) return;
      if (!window.Alpine?.store('xHelper')?.countdown) {
        this.countdownRetry = setTimeout(() => { if (this.isConnected) this.startCountdown(); }, 50);
        return;
      }
      const render = (active, seconds, minutes, hours, days) => {
        timer.hidden = !active && this.dataset.expired !== 'zero';
        for (const [key, value] of Object.entries({ days, hours, minutes, seconds })) {
          timer.querySelector(`[data-time="${key}"]`).textContent = String(value).padStart(2, '0');
        }
      };
      const expiry = Date.UTC(year, month - 1, day, hour, minute) - Number(this.dataset.timezone) * 3600000;
      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      render(remaining > 0, remaining % 60, Math.floor(remaining / 60) % 60, Math.floor(remaining / 3600) % 24, Math.floor(remaining / 86400));
      this.countdownTimer = window.Alpine.store('xHelper').countdown({ timezone: Number(this.dataset.timezone), end_year: year, end_month: month, end_day: day, end_hour: hour, end_minute: minute, signal: this.controller.signal }, render);
    }
    disconnectedCallback() {
      this.controller?.abort();
      this.observer?.disconnect();
      clearTimeout(this.targetTimer);
      clearTimeout(this.countdownRetry);
      clearInterval(this.countdownTimer);
      this.controller = null;
    }
  });
}
