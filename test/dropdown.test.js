import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { dropdown } from '../src/components/x/dropdown.js';
import { FakeElement, installDomGlobals, keyEvent, removeDomGlobals } from './helpers/fakes.js';

let originalClose;

beforeEach(() => {
  installDomGlobals();
  originalClose = dropdown._close;
  dropdown._handlers.clear();
  dropdown._menus.clear();
  dropdown._parentToMenu.clear();
});

afterEach(() => {
  dropdown._close = originalClose;
  dropdown._handlers.clear();
  dropdown._menus.clear();
  dropdown._parentToMenu.clear();
  removeDomGlobals();
});

test('ordinary dropdown cycles menu focus and supports Home, End and Escape', () => {
  const menu = new FakeElement('ul');
  const trigger = new FakeElement('button');
  const parent = new FakeElement('div');
  const items = [new FakeElement('a'), new FakeElement('a'), new FakeElement('a')];
  items.forEach(item => item.setAttribute('role', 'menuitem'));
  menu.selectorLists.set('[role="menuitem"]:not([disabled])', items);
  dropdown._bindMenuKeys(menu, trigger, parent);

  document.activeElement = items[0];
  menu.dispatchEvent(keyEvent('ArrowUp'));
  assert.equal(document.activeElement, items[2]);

  menu.dispatchEvent(keyEvent('ArrowDown'));
  assert.equal(document.activeElement, items[0]);

  menu.dispatchEvent(keyEvent('End'));
  assert.equal(document.activeElement, items[2]);

  menu.dispatchEvent(keyEvent('Home'));
  assert.equal(document.activeElement, items[0]);

  let closedParent = null;
  dropdown._close = value => { closedParent = value; };
  menu.dispatchEvent(keyEvent('Escape'));
  assert.equal(closedParent, parent);
  assert.equal(document.activeElement, trigger);
});

test('dropdown assigns menu roles and keyboard focusability', () => {
  const parent = new FakeElement('div');
  const trigger = new FakeElement('button');
  const menu = new FakeElement('ul');
  const links = [new FakeElement('a'), new FakeElement('a')];
  menu.selectorLists.set('li > a', links);

  dropdown._setupAccessibility(parent, trigger, menu);

  assert.equal(parent.classList.contains('dropdown'), true);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(trigger.getAttribute('aria-controls'), menu.id);
  assert.equal(menu.getAttribute('role'), 'menu');
  assert.ok(links.every(link => link.getAttribute('role') === 'menuitem'));
  assert.ok(links.every(link => link.getAttribute('tabindex') === '-1'));
});

test('cleanup cancels a pending input blur close', () => {
  const nativeSetTimeout = globalThis.setTimeout;
  const nativeClearTimeout = globalThis.clearTimeout;
  const token = { cleared: false };
  globalThis.setTimeout = () => token;
  globalThis.clearTimeout = value => { value.cleared = true; };

  const trigger = new FakeElement('input');
  const parent = new FakeElement('div');
  const originalCloseAll = dropdown.closeAllDropdowns;
  dropdown.closeAllDropdowns = () => {};
  dropdown._bindTrigger(parent, trigger);
  trigger.dispatchEvent(new Event('blur'));

  assert.equal(dropdown._handlers.get(trigger).blurTimeout, token);
  dropdown._cleanup();
  assert.equal(token.cleared, true);

  dropdown.closeAllDropdowns = originalCloseAll;
  globalThis.setTimeout = nativeSetTimeout;
  globalThis.clearTimeout = nativeClearTimeout;
});
