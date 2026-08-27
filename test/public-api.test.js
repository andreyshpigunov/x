import test from 'node:test';
import assert from 'node:assert/strict';

import * as api from '../index.js';

test('root API exports the documented aggregate and typograf', () => {
  assert.ok(api.x);
  assert.ok(api.X);
  assert.equal(api.x.typograf, api.typograf);
  assert.equal(api.x.dropdown, api.dropdown);
  assert.equal(api.x.autocomplete, api.autocomplete);
});

test('aggregate init and DOM selector helpers are SSR-safe', () => {
  assert.doesNotThrow(() => api.x.init());
  assert.equal(api.lib.qs('.missing'), null);
  assert.deepEqual(api.lib.qsa('.missing'), []);
});

test('public component lifecycle entry points are SSR-safe', () => {
  const components = [
    api.modal, api.animate, api.appear, api.lazyload, api.loadmore,
    api.sheets, api.dropdown, api.autocomplete, api.scroll, api.hover,
    api.device, api.form, api.sticky, api.slider
  ];

  for (const component of components) {
    if (typeof component.init === 'function') assert.doesNotThrow(() => component.init());
    if (typeof component.destroy === 'function') assert.doesNotThrow(() => component.destroy());
  }
});
