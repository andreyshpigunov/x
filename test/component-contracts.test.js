import test from 'node:test';
import assert from 'node:assert/strict';

import { animate } from '../src/components/x/animate.js';
import { appear } from '../src/components/x/appear.js';
import { form } from '../src/components/x/form.js';
import { hover } from '../src/components/x/hover.js';
import { lazyload } from '../src/components/x/lazyload.js';
import { lib } from '../src/components/x/lib.js';
import { loadmore } from '../src/components/x/loadmore.js';
import { modal } from '../src/components/x/modal.js';
import { scroll } from '../src/components/x/scroll.js';
import { sheets } from '../src/components/x/sheets.js';
import { slider } from '../src/components/x/slider.js';
import { typograf } from '../src/components/x/typograf.js';
import { FakeElement, installDomGlobals, removeDomGlobals } from './helpers/fakes.js';

test('component validators reject unsafe identifiers and accept library IDs', () => {
  assert.equal(modal._isValidId('modal_1-test'), true);
  assert.equal(modal._isValidId('modal test'), false);
  assert.equal(sheets._isValidSheetValue('sheet_1-test'), true);
  assert.equal(sheets._isValidSheetValue('sheet"]'), false);
  assert.equal(scroll._isValidId('section-1'), true);
  assert.equal(scroll._isValidSelector('#section-1'), true);
  assert.equal(scroll._isValidSelector('javascript:alert(1)'), false);
});

test('form resolves events for supported controls', () => {
  const input = new FakeElement('input');
  const select = new FakeElement('select');
  const editable = new FakeElement('div');
  editable.isContentEditable = true;

  assert.equal(form.getEventType(input), 'input');
  assert.equal(form.getEventType(select), 'change');
  assert.equal(form.getEventType(editable), 'input');
  assert.throws(() => form.getEventType(new FakeElement('button')), /Unsupported/);
});

test('appear toggles visibility classes and events', () => {
  const target = new FakeElement('div');
  let visible = 0;
  let invisible = 0;
  target.addEventListener('visible', () => { visible += 1; });
  target.addEventListener('invisible', () => { invisible += 1; });
  appear._options = { ...appear._options, appearedClass: 'appeared', visibleClass: 'visible', once: false };

  appear._observerCallback([{ target, isIntersecting: true }]);
  assert.equal(target.classList.contains('appeared'), true);
  assert.equal(target.classList.contains('visible'), true);
  assert.equal(visible, 1);

  appear._observerCallback([{ target, isIntersecting: false }]);
  assert.equal(target.classList.contains('visible'), false);
  assert.equal(invisible, 1);
});

test('lazyload unobserves non-image and empty image candidates safely', () => {
  const emptyImage = new FakeElement('img');
  let unobserved = null;
  lazyload._observer = { unobserve: value => { unobserved = value; } };
  lazyload._loadImage(emptyImage);
  assert.equal(unobserved, emptyImage);
  lazyload._observer = null;
});

test('loadmore reset restores the page counter', () => {
  loadmore.items = { marker: { page: 7 } };
  const marker = new FakeElement('div');
  marker.id = 'marker';
  const previousDocument = globalThis.document;
  globalThis.document = {};
  const originalLibQs = lib.qs;
  lib.qs = () => marker;
  loadmore.reset('#marker');
  assert.equal(loadmore.items.marker.page, 1);
  lib.qs = originalLibQs;
  if (previousDocument === undefined) delete globalThis.document;
  else globalThis.document = previousDocument;
});

test('hover synchronization and slider config use safe normalized values', () => {
  installDomGlobals();
  const root = new FakeElement('a');
  root.setAttribute('href', '#same');
  root.closestSelectors.set('[x-hover]', root);
  const peer = new FakeElement('a');
  const originalQsa = lib.qsa;
  lib.qsa = () => [root, peer];
  hover._syncHover({ target: root }, true);
  assert.equal(root.classList.contains('hover'), true);
  assert.equal(peer.classList.contains('hover'), true);
  lib.qsa = originalQsa;
  removeDomGlobals();

  assert.deepEqual(slider._validateConfig({ gap: -5, rubber: 0, touch: 1 }), {
    gap: 0,
    rubber: false,
    resetOnMouseout: true,
    touch: true
  });
});

test('animate unit conversion and typograf processing remain stable', () => {
  installDomGlobals();
  document.documentElement.clientHeight = 800;
  assert.equal(animate._2px('50vh'), 400);
  assert.equal(animate._2px(120), 120);

  const element = new FakeElement('div');
  const trigger = new FakeElement('div');
  element.isConnected = true;
  trigger.isConnected = true;
  trigger.getBoundingClientRect = () => ({ top: 100 });
  const animation = {
    element,
    trigger,
    parent: window,
    start: 100,
    end: 100,
    class: null,
    classRemove: true,
    functionName: null,
    fn: item => { item.called = true; }
  };
  animate._animations = [animation];
  animate._scroll();
  assert.equal(animation.progress, 1);
  assert.equal(animation.called, true);
  animate._animations = [];
  removeDomGlobals();

  assert.equal(typograf.process('"Hello" - 1/2'), '«Hello»\u00a0— ½');
});

test('sheets scopes duplicate keys to the requested container', () => {
  installDomGlobals();
  const firstContainer = new FakeElement('div');
  const secondContainer = new FakeElement('div');
  const firstTab = new FakeElement('button');
  const secondTab = new FakeElement('button');
  const firstBody = new FakeElement('div');
  const secondBody = new FakeElement('div');
  firstBody.closestSelectors.set('[x-sheets]', firstContainer);
  secondBody.closestSelectors.set('[x-sheets]', secondContainer);
  const originalQs = lib.qs;
  const originalQsa = lib.qsa;
  lib.qs = (selector, context) => {
    if (selector === '[x-sheet="same"]') return context === secondContainer ? secondBody : firstBody;
    if (selector === '[x-sheet-open="same"]') return context === secondContainer ? secondTab : firstTab;
    return null;
  };
  lib.qsa = (selector, context) => {
    if (selector === '[x-sheet-open]') return context === secondContainer ? [secondTab] : [firstTab];
    if (selector === '[x-sheet]') return context === secondContainer ? [secondBody] : [firstBody];
    return [];
  };

  sheets.show('same', { silent: true, source: 'api', container: secondContainer });
  assert.equal(secondTab.classList.contains('active'), true);
  assert.equal(secondBody.classList.contains('active'), true);
  assert.equal(firstTab.classList.contains('active'), false);
  assert.equal(firstBody.classList.contains('active'), false);

  lib.qs = originalQs;
  lib.qsa = originalQsa;
  removeDomGlobals();
});

test('scroll active state uses an inner scroll parent viewport', () => {
  installDomGlobals();
  document.documentElement.clientHeight = 800;
  const parent = new FakeElement('div');
  parent.clientHeight = 400;
  parent.getBoundingClientRect = () => ({ top: 300 });
  const target = new FakeElement('section');
  target.getBoundingClientRect = () => ({ top: 350, bottom: 450 });
  const link = new FakeElement('a');
  scroll._linksHash = {
    item: { parent, target, link, classActive: 'active' }
  };

  scroll._scrollObserve();
  assert.equal(link.classList.contains('active'), true);
  assert.equal(target.classList.contains('active'), true);
  scroll._linksHash = {};
  removeDomGlobals();
});
