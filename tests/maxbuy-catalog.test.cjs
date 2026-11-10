const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function component(url = 'https://shop.test/en-gh/collections/tvs?preview_theme_id=42&page=3&filter.p.product_type=TVs&section_id=old') {
  let Component;
  const assigned = [];
  const location = new URL(url);
  location.assign = value => assigned.push(value);
  const context = { HTMLElement: class { constructor() { this.dataset = {}; } }, document: { querySelectorAll: () => [null] }, URL, URLSearchParams, Set, Map, JSON, Number, Math, AbortController, DOMException, setTimeout, clearTimeout, location,
    customElements: { get: () => undefined, define: (_, value) => { Component = value; } } };
  vm.runInNewContext(fs.readFileSync('assets/main-maxbuy-collection.js', 'utf8'), context);
  return { instance: new Component(), assigned, location, context };
}
test('committing an unchecked landing entry really removes its scope and preserves market/preview', () => {
  const { instance } = component();
  const url = instance.buildURL([['filter.p.vendor', 'TECNO'], ['sort_by', 'best-selling']], '/en-gh/collections/all');
  assert.equal(url.pathname, '/en-gh/collections/all');
  assert.equal(url.searchParams.has('filter.p.product_type'), false);
  assert.equal(url.searchParams.get('filter.p.vendor'), 'TECNO');
  assert.equal(url.searchParams.get('preview_theme_id'), '42');
  assert.equal(url.searchParams.has('page'), false);
  assert.equal(url.searchParams.has('section_id'), false);
});
test('multiple values survive; duplicate name/value pairs do not; zero is a real price', () => {
  const { instance } = component();
  const url = instance.buildURL([['filter.p.product_type','Smart Phones'],['filter.p.product_type','Televisions'],['filter.p.vendor','TECNO'],['filter.p.vendor','Samsung'],['filter.p.vendor','TECNO'],['filter.v.price.gte','0'],['filter.v.price.lte',''],['sections','bad']], '/en-gh/collections/all');
  assert.deepEqual(url.searchParams.getAll('filter.p.vendor'), ['TECNO','Samsung']);
  assert.deepEqual(url.searchParams.getAll('filter.p.product_type'), ['Smart Phones','Televisions']);
  assert.equal(url.searchParams.get('filter.v.price.gte'), '0');
  assert.equal(url.searchParams.has('filter.v.price.lte'), false);
  assert.equal(url.searchParams.has('sections'), false);
});
test('cross-collection navigation uses a full navigation before any section request', async () => {
  const { instance, assigned } = component();
  await instance.navigate(new URL('https://shop.test/en-gh/collections/all?filter.p.vendor=TECNO'));
  assert.deepEqual(assigned, ['https://shop.test/en-gh/collections/all?filter.p.vendor=TECNO']);
});
test('mobile changes stay drafts; desktop changes schedule a commit', () => {
  const { instance } = component();
  let commits = 0;
  instance.schedule = () => commits++;
  const target = { type: 'checkbox', closest: () => null, matches: selector => selector.includes('input') };
  instance.media = { matches: false };
  instance.onChange({ target });
  assert.equal(commits, 0);
  instance.media.matches = true;
  instance.onChange({ target });
  assert.equal(commits, 1);
});
test('price validation rejects reversed/negative ranges without silently changing the input', () => {
  const { instance } = component();
  instance.dataset = { priceError: 'Invalid range' };
  const field = value => ({ value, validity: { badInput: false }, setCustomValidity(value) { this.error = value; } });
  const min = field('3000'), max = field('1000'), rangeMin = {}, rangeMax = {};
  const price = { dataset: { rangeMax: '6000' }, style: { setProperty() {} }, querySelector: selector => ({ '[data-price="min"]':min, '[data-price="max"]':max, '[data-range="min"]':rangeMin, '[data-range="max"]':rangeMax })[selector] };
  instance.syncPrice(price);
  assert.equal(min.error, 'Invalid range');
  assert.equal(min.value, '3000');
  min.value = '-1'; max.value = '';
  instance.syncPrice(price);
  assert.equal(min.error, 'Invalid range');
  min.value = '0';
  instance.syncPrice(price);
  assert.equal(min.error, '');
});
test('an external action cannot redirect a filter commit', () => {
  const { instance } = component();
  assert.throws(() => instance.buildURL([], 'https://other.test/collections/all'), /Invalid collection target/);
});

function requestHarness() {
  const result = component('https://shop.test/en-gh/collections/all');
  const { instance } = result;
  instance.dataset = { sectionId: 'runtime-section' };
  instance.cache = new Map();
  instance.sequence = 0;
  instance.isConnected = true;
  instance.collectionEvent = () => undefined;
  instance.querySelector = () => ({ hidden: true });
  instance.setAttribute = instance.removeAttribute = () => {};
  return result;
}
test('failed section request falls back to the full target URL', async () => {
  const { instance, assigned, context } = requestHarness();
  context.fetch = async () => { throw new Error('offline'); };
  await instance.navigate(new URL('https://shop.test/en-gh/collections/all?filter.p.vendor=TECNO'));
  assert.deepEqual(assigned, ['https://shop.test/en-gh/collections/all?filter.p.vendor=TECNO']);
});
test('missing section response falls back even when HTTP status is successful', async () => {
  const { instance, assigned, context } = requestHarness();
  context.fetch = async () => ({ ok: true, text: async () => 'null' });
  context.DOMParser = class { parseFromString() { return { getElementById: () => null }; } };
  await instance.navigate(new URL('https://shop.test/en-gh/collections/all?filter.p.vendor=LG'));
  assert.deepEqual(assigned, ['https://shop.test/en-gh/collections/all?filter.p.vendor=LG']);
});
test('superseded request failures cannot redirect away from the newest selection', async () => {
  const { instance, assigned, context } = requestHarness();
  const rejectors = [];
  context.fetch = () => new Promise((_, reject) => rejectors.push(reject));
  const old = instance.navigate(new URL('https://shop.test/en-gh/collections/all?filter.p.vendor=TECNO'));
  const latest = instance.navigate(new URL('https://shop.test/en-gh/collections/all?filter.p.vendor=Samsung'));
  rejectors[0](new Error('stale failure'));
  await old;
  assert.deepEqual(assigned, []);
  rejectors[1](new Error('latest failure'));
  await latest;
  assert.deepEqual(assigned, ['https://shop.test/en-gh/collections/all?filter.p.vendor=Samsung']);
});
test('discarding mobile drafts restores the server form without submitting', () => {
  const { instance } = component();
  let reset = 0;
  instance.querySelector = () => ({ reset: () => reset++ });
  instance.querySelectorAll = () => [];
  instance.discardDraft();
  assert.equal(reset, 1);
});
test('mobile Clear all clears the draft without committing or resetting sort', () => {
  const { instance, context } = component();
  context.Element = class {};
  const input = { type: 'checkbox', checked: true };
  const price = { type: 'number', name: 'filter.v.price.gte', value: '50' };
  const form = { querySelectorAll: selector => selector === 'input' ? [input, price] : [] };
  instance.media = { matches: false };
  instance.querySelector = () => form;
  let submitted = false, prevented = false;
  instance.submit = () => { submitted = true; };
  const target = new context.Element();
  target.closest = selector => selector === '[data-filters-clear]' ? {} : null;
  instance.onClick({ target, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(input.checked, false);
  assert.equal(price.value, '');
  assert.equal(submitted, false);
});

test('Page filtering keeps the host URL, title and intro while requesting its configured section', async () => {
  const { instance, context, assigned, location } = component('https://shop.test/en-gh/pages/deals?preview_theme_id=42');
  instance.dataset = { sectionId: 'page-section', independentSource: 'true', pageContext: 'true' };
  instance.id = 'Collection-page-section';
  instance.cache = new Map();
  instance.animations = new Map();
  instance.sequence = 0;
  instance.isConnected = true;
  instance.contains = () => false;
  instance.querySelectorAll = () => [];
  instance.setAttribute = instance.removeAttribute = instance.initContent = instance.dispatchEvent = () => {};
  instance.collectionEvent = () => undefined;
  const results = { innerHTML: 'initial Page products' };
  const error = { hidden: true };
  const intro = { breadcrumbs: 'Home > Deals' };
  let restoredIntro, requested;
  instance.querySelector = selector => ({
    '[data-collection-results]': results,
    '.maxbuy-collection__error': error,
    '.maxbuy-collection__intro': { cloneNode: () => intro, replaceWith: value => { restoredIntro = value; } },
    '[data-result-count]': { textContent: '1 product', dataset: { count: '1' } },
    '[data-collection-status]': {}
  })[selector];
  context.document.title = 'Deals';
  context.history = { state: {}, pushState(state, _, url) { this.state = state; assert.equal(url, location.href); } };
  context.CustomEvent = class {};
  context.fetch = async url => { requested = new URL(url); return { ok: true, text: async () => 'section response' }; };
  context.DOMParser = class {
    parseFromString() {
      return { getElementById: id => id === instance.id ? {
        dataset: { collectionHandle: 'lg', productCount: '1' },
        querySelector: selector => selector === '[data-collection-results]' ? {
          innerHTML: 'filtered products', querySelector: () => ({})
        } : null
      } : null };
    }
  };
  await instance.navigate(new URL('https://shop.test/en-gh/collections/lg?filter.v.availability=1&preview_theme_id=42'));
  assert.equal(requested.pathname, '/en-gh/collections/lg');
  assert.equal(requested.searchParams.get('section_id'), 'page-section');
  assert.equal(requested.searchParams.get('filter.v.availability'), '1');
  assert.equal(requested.searchParams.get('preview_theme_id'), '42');
  assert.equal(results.innerHTML, 'filtered products');
  assert.equal(restoredIntro, intro);
  assert.equal(context.document.title, 'Deals');
  assert.equal(error.hidden, true);
  assert.deepEqual(assigned, []);
  assert.equal(context.history.state.maxbuyCollections['page-section'], instance.currentURL.href);
});
