if (!customElements.get('shop-by-brand')) {
  customElements.define('shop-by-brand', class extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      const track = this.querySelector('.shop-by-brand__track');
      const buttons = this.querySelectorAll('[data-direction]');
      const navigation = this.querySelector('.shop-by-brand__navigation');
      const pages = [...track.children];
      const items = [...track.querySelectorAll('.shop-by-brand__item')];
      const desktop = window.matchMedia('(min-width: 768px)');
      const units = () => desktop.matches ? items : pages;
      const currentUnit = () => units().reduce((nearest, unit, index, list) =>
        Math.abs(unit.getBoundingClientRect().left - track.getBoundingClientRect().left) <
        Math.abs(list[nearest].getBoundingClientRect().left - track.getBoundingClientRect().left) ? index : nearest, 0);
      const update = () => {
        const position = Math.abs(track.scrollLeft);
        const maximum = track.scrollWidth - track.clientWidth;
        if (navigation) navigation.hidden = maximum <= 1;
        buttons.forEach(button => { button.disabled = Number(button.dataset.direction) < 0 ? position <= 1 : position >= maximum - 1; });
      };
      buttons.forEach(button => button.addEventListener('click', () => {
        const list = units();
        const index = Math.max(0, Math.min(list.length - 1, currentUnit() + Number(button.dataset.direction)));
        if (list[index]) track.scrollBy({ left: list[index].getBoundingClientRect().left - track.getBoundingClientRect().left });
      }, options));
      track.addEventListener('scroll', update, options);
      this.addEventListener('shopify:block:select', event => {
        const unit = event.target.closest(desktop.matches ? '.shop-by-brand__item' : '.shop-by-brand__page');
        if (unit) track.scrollBy({ left: unit.getBoundingClientRect().left - track.getBoundingClientRect().left, behavior: 'instant' });
      }, options);
      this.observer = new ResizeObserver(update);
      this.observer.observe(track);
      desktop.addEventListener('change', update, options);
      update();
    }
    disconnectedCallback() { this.controller.abort(); this.observer.disconnect(); }
  });
}
