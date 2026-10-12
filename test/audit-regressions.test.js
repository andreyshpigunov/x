import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { lib } from '../src/components/x/lib.js';
import { modal } from '../src/components/x/modal.js';
import { Slider } from '../src/components/x/slider.js';
import { loadmore } from '../src/components/x/loadmore.js';
import { FakeElement, installDomGlobals, removeDomGlobals } from './helpers/fakes.js';

beforeEach(() => {
  installDomGlobals();
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
});

afterEach(() => {
  modal.destroy();
  loadmore.destroy();
  lib.loadedScripts.clear();
  lib._loadingScripts.clear();
  removeDomGlobals();
});

test('error keys and messages remain escaped in browser and SSR rendering', () => {
  const errors = { 'x" onmouseover="alert(1)': '<script>"&\'</script>' };
  const expected = '<div class="error_x&quot; onmouseover=&quot;alert(1)">&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;</div>';
  assert.equal(lib.printErrors(errors), expected);
  removeDomGlobals();
  assert.equal(lib.printErrors(errors), expected);
});

test('modal window classes cannot break out of their HTML attribute', t => {
  const source = new FakeElement();
  source.setAttribute('x-modal', 'dialog');
  source.setAttribute('data-window-class', 'wide" onmouseover="alert(1)');
  source.innerHTML = '<p>Content</p>';
  t.mock.method(lib, 'qsa', () => [source]);
  t.mock.method(lib, 'qs', selector => selector === 'body' ? document.body : null);
  modal._renderModalContents();
  assert.ok(document.body.children[0].innerHTML.includes(
    'class="modal-window wide&quot; onmouseover=&quot;alert(1)"><p>Content</p>'
  ));
});

test('hiding an inactive modal preserves counters and scrolling through later cycles', async t => {
  const dialog = new FakeElement();
  dialog.id = 'dialog';
  t.mock.method(lib, 'qs', selector => selector === '#dialog' ? dialog : null);
  modal.html = document.documentElement;

  await modal.hide('dialog');
  assert.equal(modal.modalLevel, 0);
  for (let i = 0; i < 2; i++) {
    await modal.show('dialog');
    assert.equal(modal.modalLevel, 1);
    assert.equal(document.documentElement.classList.contains('modal_active'), true);
    await modal.hide('dialog');
    await modal.hide('dialog');
    assert.equal(modal.modalLevel, 0);
    assert.equal(document.documentElement.classList.contains('modal_active'), false);
  }
});

for (const mode of ['desktop', 'touch', 'touch-disabled']) {
  test(`slider restores original nodes and supports repeated init/destroy (${mode})`, () => {
    if (mode !== 'desktop') window.ontouchstart = null;
    const element = new FakeElement();
    element.setAttribute('x-slider', JSON.stringify({ touch: mode !== 'touch-disabled' }));
    element.classList.add('gallery');
    element.style.overflow = 'visible';
    element.style.overscrollBehavior = 'auto';
    const originals = Array.from({ length: 3 }, () => new FakeElement('article'));
    originals.forEach(node => element.appendChild(node));
    let clicks = 0;
    originals[0].addEventListener('click', () => { clicks++; });

    let observerCallback;
    class Observer {
      constructor(callback) { observerCallback = callback; }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    globalThis.IntersectionObserver = window.IntersectionObserver = Observer;
    globalThis.MutationObserver = window.MutationObserver = class {
      observe() {}
      disconnect() {}
    };
    document.querySelectorAll = () => [element];
    const instance = new Slider();
    try {
      for (let i = 0; i < 2; i++) {
        instance.init();
        observerCallback([{ isIntersecting: true, target: element }]);
        const wrapper = element.children[0];
        assert.equal(wrapper.children.length, 3);
        instance.initSlider(element);
        assert.equal(element.children[0], wrapper);
        instance.destroy();
        assert.deepEqual(element.children, originals);
        assert.equal(element.classList.contains('gallery'), true);
        assert.equal(element.classList.contains('slider'), false);
        assert.equal(element.classList.contains('slider_touch'), false);
        assert.equal(element.style.overflow, 'visible');
        assert.equal(element.style.overscrollBehavior, 'auto');
      }
      originals[0].dispatchEvent(new Event('click'));
      assert.equal(clicks, 1);
    } finally {
      instance.destroy();
    }
  });
}

test('concurrent script consumers wait for the same successful load', () => {
  const calls = [];
  const event = new Event('load');
  lib.loadScript('/dependency.js', function (e) { calls.push(['first', this, e]); });
  lib.loadScript('/dependency.js', function (e) { calls.push(['second', this, e]); });
  assert.equal(document.body.children.length, 1);
  assert.deepEqual(calls, []);
  const script = document.body.children[0];
  script.onload(event);
  assert.deepEqual(calls, [['first', script, event], ['second', script, event]]);
  lib.loadScript('/dependency.js', () => calls.push('cached'));
  assert.equal(calls.at(-1), 'cached');
  assert.equal(document.body.children.length, 1);
});

test('failed scripts can be retried and a failing consumer does not block others', t => {
  const calls = [];
  t.mock.method(console, 'error', () => {});
  lib.loadScript('/retry.js', () => calls.push('failed attempt'));
  document.body.children[0].onerror();
  assert.deepEqual(calls, []);
  lib.loadScript('/retry.js', () => { throw new Error('consumer failed'); });
  lib.loadScript('/retry.js', () => calls.push('retry loaded'));
  document.body.children[0].onload();
  assert.deepEqual(calls, ['retry loaded']);
});

for (const sameBatch of [false, true]) {
  test(`loadmore loads independent markers concurrently (same batch: ${sameBatch})`, async t => {
    const a = new FakeElement();
    const b = new FakeElement();
    a.setAttribute('x-loadmore', '{"functionName":"loadA"}');
    b.setAttribute('x-loadmore', '{"functionName":"loadB"}');
    t.mock.method(lib, 'qsa', () => [a, b]);
    let nextId = 0;
    t.mock.method(lib, 'makeId', () => `marker-${++nextId}`);
    let callback;
    const observed = new Set();
    class Observer {
      constructor(cb) { callback = cb; }
      observe(el) { observed.add(el); }
      unobserve(el) { observed.delete(el); }
      disconnect() { observed.clear(); }
    }
    globalThis.IntersectionObserver = window.IntersectionObserver = Observer;
    let finishA, finishB;
    const pagesA = [], pagesB = [];
    window.loadA = page => { pagesA.push(page); return new Promise(resolve => { finishA = resolve; }); };
    window.loadB = page => { pagesB.push(page); return new Promise(resolve => { finishB = resolve; }); };
    loadmore.init();
    const entryA = { target: a, isIntersecting: true };
    const entryB = { target: b, isIntersecting: true };
    const pendingA = callback(sameBatch ? [entryA, entryB] : [entryA], loadmore.observer);
    const pendingB = sameBatch ? null : callback([entryB], loadmore.observer);
    await callback([entryA, entryB], loadmore.observer);
    assert.deepEqual(pagesA, [1]);
    assert.deepEqual(pagesB, [1]);
    finishA(true);
    finishB(false);
    await Promise.all([pendingA, pendingB]);
    assert.equal(loadmore.items[a.id].page, 2);
    assert.equal(observed.has(a), true);
    assert.equal(observed.has(b), false);
    const next = callback([entryA], loadmore.observer);
    assert.deepEqual(pagesA, [1, 2]);
    finishA(false);
    await next;
    assert.equal(observed.has(a), false);
  });
}
