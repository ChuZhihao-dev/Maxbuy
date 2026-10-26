if (!customElements.get('product-promotion')) {
  customElements.define('product-promotion', class extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      this.expires = Number(this.dataset.expires);
      this.button = this.querySelector('[data-copy]');
      this.code = this.querySelector('[data-code]');
      this.status = this.querySelector('[data-copy-status]');
      this.units = Object.fromEntries(['days', 'hours', 'minutes', 'seconds'].map(unit => [unit, this.querySelector(`[data-time="${unit}"]`)]));
      if (!Number.isFinite(this.expires) || this.expires <= Date.now()) {
        this.hidden = true;
        return;
      }
      this.button.textContent = this.dataset.copyLabel;
      this.status.textContent = '';
      this.button.addEventListener('click', () => this.copyCode(), { signal: this.controller.signal });
      const remaining = Math.max(0, Math.floor((this.expires - Date.now()) / 1000));
      this.render(true, remaining % 60, Math.floor(remaining / 60) % 60, Math.floor(remaining / 3600) % 24, Math.floor(remaining / 86400));
      this.startCountdown();
    }

    startCountdown() {
      if (!this.isConnected || this.controller.signal.aborted || this.hidden) return;
      const helper = window.Alpine?.store('xHelper');
      if (!helper?.countdownByTime) {
        this.retryTimer = setTimeout(() => this.startCountdown(), 50);
        return;
      }
      this.countdownTimer = helper.countdownByTime(0, this.expires, (...values) => this.render(...values));
    }

    render(active, seconds, minutes, hours, days) {
      if (!this.isConnected || this.controller.signal.aborted) return;
      this.hidden = !active;
      this.button.disabled = !active;
      for (const [unit, value] of Object.entries({ days, hours, minutes, seconds })) {
        this.units[unit].textContent = String(value).padStart(2, '0');
      }
      if (!active) clearInterval(this.countdownTimer);
    }

    async copyCode() {
      if (this.copying || this.hidden || this.expires <= Date.now()) return;
      const signal = this.controller.signal;
      this.copying = true;
      this.button.setAttribute('aria-busy', 'true');
      this.status.textContent = '';
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(this.code.textContent.trim());
        if (signal.aborted) return;
        this.button.textContent = this.dataset.copiedLabel;
        this.status.textContent = this.dataset.copiedLabel;
        clearTimeout(this.copyTimer);
        this.copyTimer = setTimeout(() => {
          if (!signal.aborted) this.button.textContent = this.dataset.copyLabel;
        }, 3000);
      } catch {
        if (!signal.aborted) {
          this.status.textContent = this.dataset.copyError;
          this.code.focus();
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            range.selectNodeContents(this.code);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      } finally {
        if (!signal.aborted) {
          this.copying = false;
          this.button.removeAttribute('aria-busy');
        }
      }
    }

    disconnectedCallback() {
      this.controller?.abort();
      clearInterval(this.countdownTimer);
      clearTimeout(this.retryTimer);
      clearTimeout(this.copyTimer);
      this.controller = null;
      this.copying = false;
    }
  });
}
