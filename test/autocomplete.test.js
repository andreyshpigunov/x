import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { autocomplete } from '../src/components/x/autocomplete.js';

class FakeElement extends EventTarget {
  constructor() {
    super();
    this.dataset = {};
    this.innerHTML = '';
    this.value = '';
    this.selectors = new Map();
  }

  querySelector(selector) {
    return this.selectors.get(selector) ?? null;
  }

  closest(selector) {
    return selector === '[data-item]' && this.dataset.item ? this : null;
  }
}

class FakeNodeList extends Array {}

let dropdown;
let field;
let list;

beforeEach(() => {
  dropdown = new FakeElement();
  field = new FakeElement();
  list = new FakeElement();
  field.value = 'query';
  dropdown.selectors.set('[x-dropdown-open]', field);
  dropdown.selectors.set('[x-dropdown]', list);

  globalThis.Node = FakeElement;
  globalThis.NodeList = FakeNodeList;
  globalThis.window = {};
  globalThis.document = {
    activeElement: null,
    getElementById: id => id === 'search' ? dropdown : null
  };
});

afterEach(() => {
  autocomplete.destroy();
  delete globalThis.document;
  delete globalThis.window;
  delete globalThis.Node;
  delete globalThis.NodeList;
});

test('selects the first suggestion on hide by default', () => {
  const selected = [];
  let resets = 0;
  autocomplete.init('search', {
    onSelect: item => selected.push(item),
    resetFunc: () => { resets += 1; }
  });

  const instance = autocomplete.get('search');
  instance.data = [{ id: 1 }, { id: 2 }];
  dropdown.dispatchEvent(new Event('dropdown:afterhide'));

  assert.deepEqual(selected, [{ id: 1 }]);
  assert.equal(resets, 0);
});

test('resets without selecting the first suggestion when selectFirstOnBlur is false', () => {
  const selected = [];
  let resets = 0;
  autocomplete.init('search', {
    selectFirstOnBlur: false,
    onSelect: item => selected.push(item),
    resetFunc: () => { resets += 1; }
  });

  const instance = autocomplete.get('search');
  instance.data = [{ id: 1 }, { id: 2 }];
  dropdown.dispatchEvent(new Event('dropdown:afterhide'));

  assert.deepEqual(selected, []);
  assert.equal(resets, 1);
  assert.equal(instance.data, null);
});

test('explicit pointer selection wins when hide happens before click', () => {
  const selected = [];
  let resets = 0;
  autocomplete.init('search', {
    selectFirstOnBlur: false,
    onSelect: item => selected.push(item),
    resetFunc: () => { resets += 1; }
  });

  const instance = autocomplete.get('search');
  instance.data = [{ id: 1 }, { id: 2 }];
  const item = new FakeElement();
  item.dataset.item = JSON.stringify({ id: 2 });

  instance._pointerDownHandler({ target: item });
  dropdown.dispatchEvent(new Event('dropdown:afterhide'));
  instance._clickHandler({ target: item });

  assert.deepEqual(selected, [{ id: 2 }]);
  assert.equal(resets, 0);
});

test('explicit click selection is not replaced when hide happens afterwards', () => {
  const selected = [];
  let resets = 0;
  autocomplete.init('search', {
    selectFirstOnBlur: false,
    onSelect: item => selected.push(item),
    resetFunc: () => { resets += 1; }
  });

  const instance = autocomplete.get('search');
  instance.data = [{ id: 1 }, { id: 2 }];
  const item = new FakeElement();
  item.dataset.item = JSON.stringify({ id: 2 });

  instance._clickHandler({ target: item });
  dropdown.dispatchEvent(new Event('dropdown:afterhide'));

  assert.deepEqual(selected, [{ id: 2 }]);
  assert.equal(resets, 0);
});
