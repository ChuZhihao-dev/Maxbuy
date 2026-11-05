const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function gallery({ width = 1440, sticky = false, connected = true } = {}) {
  let createGallery;
  const listeners = new Map(), scrolls = [], classChanges = [];
  const frames = [];
  let deferFrames = false;
  const items = ['1', '2'].map((id, index) => ({
    dataset: { mediaId: id, mediaType: 'image' },
    getBoundingClientRect: () => ({ top: index * 300 + 100 }),
    classList: { add: (...names) => classChanges.push(...names), remove: () => {} },
  }));
  const wrapper = { querySelector: () => null, dataset: {} };
  const window = { innerWidth: width, scrollY: 25, scrollTo: value => scrolls.push(value), Maximize: { checkFileNotLoaded: () => true } };
  const context = {
    window,
    document: {
      contains: () => connected,
      getElementsByClassName: () => [],
      addEventListener(name, fn) { if (name === 'alpine:init') fn(); else listeners.set(name, fn); },
    },
    Alpine: { data: (_, factory) => { createGallery = factory; }, store: () => ({ isOpen: sticky }) },
    requestAnimationFrame: fn => deferFrames ? frames.push(fn) : fn(),
    SwiffySlider: class { constructor() { this.slides = items; } },
    PRODUCT_EVENT: { updatedVariant: 'variant:' },
    PRODUCT_MEDIA_DESKTOP_LAYOUT: { grid2Columns: 'grid_2_columns', slider2Columns: '2_columns' },
    MIN_DEVICE_WIDTH: { tablet: 768 },
    SWIFFY_SLIDER_EVENT: { slide: 'slide' },
    installMediaQueryWatcher: () => {},
    setTimeout, clearTimeout,
  };
  vm.runInNewContext(fs.readFileSync('assets/media-gallery.js', 'utf8'), context);
  const state = createGallery(wrapper, 'main', 'enlarge', false, 'grid_2_columns');
  state.sectionContainer = { querySelectorAll: () => items };
  state.mediaWrapper = { dataset: {} };
  state.productMediasInfo = [{ id: 1 }, { id: 2 }];
  state.activeMediaId = '1';
  state.handleInitSwiffy({ addEventListener() {} }, {});
  const change = id => listeners.get('variant:main')({ detail: { currentVariant: { featured_media: { id } }, previewMediaId: id } });
  return { state, change, scrolls, classChanges, defer() { deferFrames = true; }, flush() { while (frames.length) frames.shift()(); } };
}

test('changing color with the same image causes no scroll, zoom pulse or border highlight', () => {
  const g = gallery();
  g.change(1); g.change(1);
  assert.equal(g.state.activeMediaId, '1');
  assert.equal(g.scrolls.length, 0);
  assert.deepEqual(g.classChanges, []);
});

test('a variant with a different image still changes active media and scrolls once without highlight', () => {
  const g = gallery();
  g.change(2);
  assert.equal(g.state.activeMediaId, '2');
  assert.equal(g.scrolls.length, 1);
  assert.equal(g.scrolls[0].top, 425);
  assert.deepEqual(g.classChanges, []);
});

test('a media id missing from the gallery is safe', () => {
  const g = gallery();
  assert.doesNotThrow(() => g.change(999));
  assert.equal(g.scrolls.length, 0);
});

test('rapid changes discard the queued scroll to the obsolete image', () => {
  const g = gallery();
  g.defer(); g.change(2); g.change(1); g.flush();
  assert.equal(g.scrolls.length, 1);
  assert.equal(g.scrolls[0].top, 125);
  assert.deepEqual(g.classChanges, []);
});

test('mobile and sticky purchase mode update media without desktop autoscroll', () => {
  for (const options of [{ width: 375 }, { sticky: true }]) {
    const g = gallery(options); g.change(2);
    assert.equal(g.state.activeMediaId, '2');
    assert.equal(g.scrolls.length, 0);
  }
});

test('a detached gallery ignores variant updates', () => {
  const g = gallery({ connected: false }); g.change(2);
  assert.equal(g.state.activeMediaId, '1');
  assert.equal(g.scrolls.length, 0);
});
