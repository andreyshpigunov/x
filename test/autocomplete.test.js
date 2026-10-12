import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { autocomplete } from '../src/components/x/autocomplete.js';

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    names.forEach(name => this.values.add(name));
  }

  remove(...names) {
    names.forEach(name => this.values.delete(name));
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeElement extends EventTarget {
  constructor() {
    super();
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.dataset = {};
    this.id = '';
    this.innerHTML = '';
    this.items = [];
    this.blurCalls = 0;
    this.scrollCalls = 0;
    this.value = '';
    this.selectors = new Map();
  }

  querySelector(selector) {
    return this.selectors.get(selector) ?? null;
  }

  querySelectorAll(selector) {
    return selector === '[data-item]' ? this.items : [];
  }

  getAttribute(name) {
    if (name === 'id') return this.id || null;
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    if (name === 'id') this.id = String(value);
    else this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    if (name === 'id') this.id = '';
    else this.attributes.delete(name);
  }

  closest(selector) {
    return selector === '[data-item]' && this.dataset.item ? this : null;
  }

  blur() {
    this.blurCalls += 1;
  }

  scrollIntoView() {
    this.scrollCalls += 1;
  }
}

class FakeNodeList extends Array {}

let dropdown;
let field;
let list;

const keyEvent = key => ({
  key,
  defaultPrevented: false,
  preventDefault() {
    this.defaultPrevented = true;
  }
});

const suggestion = item => {
  const element = new FakeElement();
  element.dataset.item = JSON.stringify(item);
  return element;
};

beforeEach(() => {
  dropdown = new FakeElement();
  field = new FakeElement();
  list = new FakeElement();
  field.value = 'query';
  dropdown.selectors.set('[x-dropdown-open]', field);
  dropdown.selectors.set('[x-dropdown]', list);
  dropdown.classList.add('dropdown_open');

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
  const item = suggestion({ id: 2 });
  list.items = [item];

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
  const item = suggestion({ id: 2 });
  list.items = [item];

  instance._clickHandler({ target: item });
  dropdown.dispatchEvent(new Event('dropdown:afterhide'));

  assert.deepEqual(selected, [{ id: 2 }]);
  assert.equal(resets, 0);
});

test('adds combobox ARIA semantics and cycles through rendered suggestions', () => {
  autocomplete.init('search', {
    renderItem: item => `<li data-item='${JSON.stringify(item)}'>${item.id}</li>`
  });

  const instance = autocomplete.get('search');
  const items = [suggestion({ id: 1 }), suggestion({ id: 2 }), suggestion({ id: 3 })];
  list.items = items;
  instance.data = [{ id: 1 }, { id: 2 }, { id: 3 }];
  instance.render();

  assert.equal(field.getAttribute('role'), 'combobox');
  assert.equal(field.getAttribute('aria-autocomplete'), 'list');
  assert.equal(field.getAttribute('aria-controls'), list.id);
  assert.equal(list.getAttribute('role'), 'listbox');
  assert.ok(items.every(item => item.getAttribute('role') === 'option'));

  instance._keyHandler(keyEvent('ArrowDown'));
  assert.equal(instance._activeItem, items[0]);
  assert.equal(items[0].getAttribute('aria-selected'), 'true');
  assert.equal(field.getAttribute('aria-activedescendant'), items[0].id);

  instance._keyHandler(keyEvent('ArrowUp'));
  assert.equal(instance._activeItem, items[2]);
  assert.equal(items[0].getAttribute('aria-selected'), 'false');
  assert.equal(items[2].classList.contains('active'), true);

  instance._keyHandler(keyEvent('ArrowDown'));
  assert.equal(instance._activeItem, items[0]);
});

test('does not navigate suggestions while the dropdown is closed', () => {
  autocomplete.init('search', {
    renderItem: item => `<li data-item='${JSON.stringify(item)}'>${item.id}</li>`
  });

  const instance = autocomplete.get('search');
  const item = suggestion({ id: 1 });
  list.items = [item];
  instance.data = [{ id: 1 }];
  instance.render();
  dropdown.classList.remove('dropdown_open');

  const event = keyEvent('ArrowDown');
  instance._keyHandler(event);

  assert.equal(event.defaultPrevented, false);
  assert.equal(instance._activeItem, null);
});

test('Enter explicitly selects the active suggestion', () => {
  const selected = [];
  autocomplete.init('search', {
    selectFirstOnBlur: false,
    renderItem: item => `<li data-item='${JSON.stringify(item)}'>${item.id}</li>`,
    onSelect: item => selected.push(item)
  });

  const instance = autocomplete.get('search');
  const items = [suggestion({ id: 1 }), suggestion({ id: 2 })];
  list.items = items;
  instance.data = [{ id: 1 }, { id: 2 }];
  instance.render();
  instance._keyHandler(keyEvent('ArrowDown'));
  instance._keyHandler(keyEvent('ArrowDown'));
  instance._keyHandler(keyEvent('Enter'));

  assert.deepEqual(selected, [{ id: 2 }]);
  assert.equal(field.blurCalls, 1);
});

test('Enter without an active suggestion does not select the first result when disabled', () => {
  const selected = [];
  let resets = 0;
  autocomplete.init('search', {
    selectFirstOnBlur: false,
    onSelect: item => selected.push(item),
    resetFunc: () => { resets += 1; }
  });

  const instance = autocomplete.get('search');
  instance.data = [{ id: 1 }, { id: 2 }];
  instance._keyHandler(keyEvent('Enter'));
  dropdown.dispatchEvent(new Event('dropdown:afterhide'));

  assert.deepEqual(selected, []);
  assert.equal(resets, 1);
  assert.equal(field.blurCalls, 1);
});

test('Escape closes without selection and clears the active suggestion', () => {
  const selected = [];
  autocomplete.init('search', {
    renderItem: item => `<li data-item='${JSON.stringify(item)}'>${item.id}</li>`,
    onSelect: item => selected.push(item)
  });

  const instance = autocomplete.get('search');
  const items = [suggestion({ id: 1 }), suggestion({ id: 2 })];
  list.items = items;
  instance.data = [{ id: 1 }, { id: 2 }];
  instance.render();
  instance._keyHandler(keyEvent('ArrowDown'));
  instance._keyHandler(keyEvent('Escape'));
  dropdown.dispatchEvent(new Event('dropdown:afterhide'));

  assert.deepEqual(selected, []);
  assert.equal(instance._activeItem, null);
  assert.equal(field.getAttribute('aria-activedescendant'), null);
  assert.equal(items[0].classList.contains('active'), false);
  assert.equal(field.blurCalls, 1);
});

test('re-render clears the previous active suggestion and prepares new items', () => {
  autocomplete.init('search', {
    renderItem: item => `<li data-item='${JSON.stringify(item)}'>${item.id}</li>`
  });

  const instance = autocomplete.get('search');
  const oldItem = suggestion({ id: 1 });
  list.items = [oldItem];
  instance.data = [{ id: 1 }];
  instance.render();
  instance._keyHandler(keyEvent('ArrowDown'));

  const newItem = suggestion({ id: 2 });
  list.items = [newItem];
  instance.data = [{ id: 2 }];
  instance.render();

  assert.equal(oldItem.classList.contains('active'), false);
  assert.equal(instance._activeItem, null);
  assert.equal(field.getAttribute('aria-activedescendant'), null);
  assert.equal(newItem.getAttribute('role'), 'option');
  assert.equal(newItem.getAttribute('aria-selected'), 'false');
});

test('clearing input immediately discards pending results and prevents blur selection', async () => {
  let resolve;
  const selected = [];
  autocomplete.init('search', {
    loadData: () => new Promise(done => { resolve = done; }),
    renderItem: item => item.name,
    onSelect: item => selected.push(item)
  });
  const instance = autocomplete.get('search');
  const pending = instance._loadData();
  field.value = '';
  field.dispatchEvent(new Event('input'));
  resolve([{ name: 'obsolete' }]);
  await pending;
  assert.equal(instance.data, null);
  assert.equal(list.innerHTML, instance.defaultStateHtml);
  dropdown.dispatchEvent(new Event('dropdown:afterhide'));
  assert.deepEqual(selected, []);
});

test('new input invalidates old results before the debounce expires', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let resolve;
  const selected = [];
  autocomplete.init('search', {
    loadData: () => new Promise(done => { resolve = done; }),
    renderItem: item => item.name,
    onSelect: item => selected.push(item)
  });
  const instance = autocomplete.get('search');
  instance.data = [{ name: 'previous' }];
  const pending = instance._loadData();
  field.value = 'new query';
  field.dispatchEvent(new Event('input'));
  resolve([{ name: 'obsolete' }]);
  await pending;
  assert.equal(instance.data, null);
  assert.equal(list.innerHTML, instance.loadingStateHtml);
  dropdown.dispatchEvent(new Event('dropdown:afterhide'));
  assert.deepEqual(selected, []);
  t.mock.timers.tick(400);
  assert.equal(list.innerHTML, instance.defaultStateHtml);
});

test('requests started in the same millisecond still discard older responses', async t => {
  t.mock.method(Date, 'now', () => 100);
  const responses = [];
  autocomplete.init('search', {
    loadData: () => new Promise(resolve => responses.push(resolve)),
    renderItem: item => item.name
  });
  const instance = autocomplete.get('search');
  const first = instance._loadData();
  const second = instance._loadData();
  responses[1]([{ name: 'latest' }]);
  await second;
  responses[0]([{ name: 'obsolete' }]);
  await first;
  assert.equal(list.innerHTML, 'latest');
});

test('destroy without reset cancels debounce and ignores in-flight responses', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let resolve;
  let loads = 0, maps = 0, resets = 0;
  autocomplete.init('search', {
    loadData: () => { loads++; return new Promise(done => { resolve = done; }); },
    mapData: data => { maps++; return data; },
    resetFunc: () => { resets++; },
    renderItem: item => item.name
  });
  const instance = autocomplete.get('search');
  const pending = instance._loadData();
  field.dispatchEvent(new Event('focus'));
  autocomplete.destroy('search', { reset: false });
  resolve([{ name: 'obsolete' }]);
  await pending;
  t.mock.timers.tick(400);
  assert.equal(loads, 1);
  assert.equal(maps, 0);
  assert.equal(resets, 0);
  assert.equal(instance.data, null);
});
