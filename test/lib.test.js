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
