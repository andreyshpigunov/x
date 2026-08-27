import test from 'node:test';
import assert from 'node:assert/strict';

import { lib } from '../src/components/x/lib.js';

const THIN_SPACE = '\u2009';

test('price leaves four-digit prices ungrouped', () => {
  assert.equal(lib.price(999), '999');
  assert.equal(lib.price(1000), '1000');
  assert.equal(lib.price(5500), '5500');
  assert.equal(lib.price(9999), '9999');
});

test('price groups prices starting at 10 000 and preserves fractions', () => {
  assert.equal(lib.price(9999.5), '9999.50');
  assert.equal(lib.price(10000), `10${THIN_SPACE}000`);
  assert.equal(lib.price(10000.5), `10${THIN_SPACE}000.50`);
  assert.equal(lib.price(1234567.89), `1${THIN_SPACE}234${THIN_SPACE}567.89`);
});

test('selector helpers do not reference DOM globals during SSR', () => {
  assert.equal(lib.qs('.item'), null);
  assert.deepEqual(lib.qsa('.item'), []);
});

test('render preserves numeric zero and boolean false', async () => {
  const originalQsa = lib.qsa;
  const element = { innerHTML: '' };
  lib.qsa = () => [element];

  await lib.render(element, 0);
  assert.equal(element.innerHTML, '0');
  await lib.render(element, false);
  assert.equal(element.innerHTML, 'false');

  lib.qsa = originalQsa;
});

test('validation and formatting utilities keep their public contracts', () => {
  assert.equal(lib.phone('8 (912) 345-67-89'), '+7 912 345-67-89');
  assert.equal(lib.phoneCleaner('912 345-67-89'), '79123456789');
  assert.equal(lib.isEmail('hello@example.com'), true);
  assert.equal(lib.isEmail('hello@example'), false);
  assert.equal(lib.numberDecline(21, 'товар', 'товара', 'товаров'), 'товар');
  assert.equal(lib.numberDecline(12, 'товар', 'товара', 'товаров'), 'товаров');
});
