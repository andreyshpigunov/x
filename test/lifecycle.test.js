import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { lib } from '../src/components/x/lib.js';
import { modal } from '../src/components/x/modal.js';
import { sticky } from '../src/components/x/sticky.js';
import { Slider, slider } from '../src/components/x/slider.js';
import { device } from '../src/components/x/device.js';
import { FakeElement, installDomGlobals, removeDomGlobals } from './helpers/fakes.js';

afterEach(() => {
  removeDomGlobals();
});

test('reinitializing modal does not duplicate opener handlers', () => {
  installDomGlobals();
  const link = new FakeElement('a');
  link.setAttribute('x-modal-open', 'sample');
  const html = document.documentElement;
  const body = document.body;
  const originalQsa = lib.qsa;
  const originalQs = lib.qs;
  const originalShow = modal.show;
  lib.qsa = selector => selector === '[x-modal-open]' ? [link] : [];
  lib.qs = selector => selector === 'html' ? html : selector === 'body' ? body : null;

  let calls = 0;
  modal.show = () => { calls += 1; };
  modal.init();
  modal.init();
  link.dispatchEvent(new Event('click', { cancelable: true }));
  assert.equal(calls, 1);

  modal.destroy();
  link.dispatchEvent(new Event('click', { cancelable: true }));
  assert.equal(calls, 1);
  modal.show = originalShow;
  lib.qsa = originalQsa;
  lib.qs = originalQs;
});

test('sticky destroy removes observation markers and permits reinit', () => {
  installDomGlobals();
  const item = new FakeElement('header');
  item.classList.add('sticky');
  const observers = [];
  class FakeObserver {
    constructor() {
      this.observed = [];
      observers.push(this);
    }
    observe(value) { this.observed.push(value); }
    unobserve(value) { this.observed = this.observed.filter(item => item !== value); }
    disconnect() { this.disconnected = true; }
  }
  globalThis.IntersectionObserver = FakeObserver;
  window.IntersectionObserver = FakeObserver;
  const originalQsa = lib.qsa;
  lib.qsa = selector => selector === '.sticky' ? [item] : [];

  sticky.init();
  assert.equal(item.dataset.stickyObserved, 'true');
  sticky.destroy();
  assert.equal(item.dataset.stickyObserved, undefined);
  sticky.init();
  assert.equal(observers.length, 2);
  assert.deepEqual(observers[1].observed, [item]);

  sticky.destroy();
  lib.qsa = originalQsa;
});

test('slider lifecycle is SSR-safe and destroy removes touch resize handlers', () => {
  assert.doesNotThrow(() => new Slider().init());
  assert.doesNotThrow(() => new Slider().destroy());

  const { window } = installDomGlobals();
  const target = new FakeElement('div');
  const resize = () => {};
  const removed = [];
  window.removeEventListener = (type, handler) => removed.push([type, handler]);
  slider.instances.set(target, {
    listenerTarget: target,
    touch: true,
    events: {
      touchstart() {}, touchmove() {}, touchend() {}, touchcancel() {}, resize
    }
  });
  slider.destroy();

  assert.ok(removed.some(([type, handler]) => type === 'resize' && handler === resize));
  assert.ok(removed.some(([type, handler]) => type === 'orientationchange' && handler === resize));
  assert.equal(slider.io, null);
  assert.equal(slider.mo, null);
});

test('touch-disabled slider is unobserved and repeated init stays idempotent', () => {
  const { window } = installDomGlobals();
  window.ontouchstart = null;
  const element = new FakeElement('div');
  element.setAttribute('x-slider', JSON.stringify({ touch: false }));
  element.appendChild(new FakeElement('div'));
  element.appendChild(new FakeElement('div'));
  const instance = new Slider();
  let unobserved = 0;
  instance.io = { unobserve: () => { unobserved += 1; } };

  instance.initSlider(element);
  assert.equal(unobserved, 1);
  assert.equal(instance.instances.size, 0);

  let intersectionObservers = 0;
  let mutationObservers = 0;
  class FakeIntersectionObserver {
    constructor() { intersectionObservers += 1; }
    observe() {}
    disconnect() {}
  }
  class FakeMutationObserver {
    constructor() { mutationObservers += 1; }
    observe() {}
    disconnect() {}
  }
  globalThis.IntersectionObserver = FakeIntersectionObserver;
  globalThis.MutationObserver = FakeMutationObserver;
  window.IntersectionObserver = FakeIntersectionObserver;
  window.MutationObserver = FakeMutationObserver;

  const idempotent = new Slider();
  idempotent.init();
  idempotent.init();
  assert.equal(intersectionObservers, 1);
  assert.equal(mutationObservers, 1);
  idempotent.destroy();
});

test('device init refreshes viewport state before the first resize event', () => {
  const { window } = installDomGlobals();
  window.innerWidth = 1300;
  window.innerHeight = 900;
  device.init();

  assert.equal(device.width, 1300);
  assert.equal(device.height, 900);
  assert.equal(device.breakpoint, 'xl');
  assert.equal(device.size.xl, true);
  device.destroy();
});
