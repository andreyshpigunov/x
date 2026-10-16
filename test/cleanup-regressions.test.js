import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { lib } from '../src/components/x/lib.js';
import { modal } from '../src/components/x/modal.js';
import { dropdown } from '../src/components/x/dropdown.js';
import { device } from '../src/components/x/device.js';
import { animate } from '../src/components/x/animate.js';
import { appear } from '../src/components/x/appear.js';
import { sticky } from '../src/components/x/sticky.js';
import { lazyload } from '../src/components/x/lazyload.js';
import { loadmore } from '../src/components/x/loadmore.js';
import { typograf } from '../src/components/x/typograf.js';
import { Slider } from '../src/components/x/slider.js';
import { x } from '../src/js/x.js';
import { FakeElement, installDomGlobals, removeDomGlobals } from './helpers/fakes.js';

beforeEach(() => {
  installDomGlobals();
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
});
afterEach(() => {
  x.destroy();
  clearTimeout(lib._transitionTimer);
  delete globalThis.Image;
  removeDomGlobals();
});
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
function observers() {
  const instances = [];
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; this.targets = new Set(); instances.push(this); }
    observe(el) { this.targets.add(el); }
    unobserve(el) { this.targets.delete(el); }
    disconnect() { this.targets.clear(); this.disconnected = true; }
  }
  globalThis.IntersectionObserver = window.IntersectionObserver = Observer;
  return instances;
}
function modalFixture(t) {
  const dialog = new FakeElement(); dialog.id = 'sample';
  t.mock.method(lib, 'qs', selector => selector === '#sample' ? dialog : selector === 'html' ? document.documentElement : null);
  modal.html = document.documentElement;
  return dialog;
}

test('transitionsOff cancels an earlier delayed enable and both aliases clear on enable', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  lib.transitionsOff(); lib.transitionsOn(20); lib.transitionsOff();
  t.mock.timers.tick(30);
  assert.equal(document.documentElement.classList.contains('no-transitions'), true);
  assert.equal(document.documentElement.classList.contains('noTransitions'), true);
  lib.transitionsOn(); t.mock.timers.tick(0);
  assert.equal(document.documentElement.classList.contains('no-transitions'), false);
  assert.equal(document.documentElement.classList.contains('noTransitions'), false);
});

test('modal destroy settles opening and closing without stale events or scroll locks', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const dialog = modalFixture(t); let opened = 0, closed = 0;
  dialog.addEventListener('modal:open', () => opened++);
  dialog.addEventListener('modal:close', () => closed++);
  const pending = modal.show('sample');
  t.mock.timers.tick(10); await flush();
  assert.equal(dialog.classList.contains('modal_active'), true);
  modal.destroy(); await pending;
  t.mock.timers.tick(500); await flush();
  assert.equal(opened, 0); assert.equal(modal.lockCount, 0);
  assert.equal(dialog.classList.contains('modal_ready'), false);
  assert.equal(document.documentElement.classList.contains('modal_active'), false);
  const next = modal.show('sample'); t.mock.timers.tick(10); await flush(); t.mock.timers.tick(200); await next;
  assert.equal(opened, 1);
  const closing = modal.hide('sample'); modal.destroy(); await closing;
  t.mock.timers.tick(500); await flush();
  assert.equal(closed, 0); assert.equal(modal.modalLevel, 0);
});

test('modal terminal callback can close the newly opened modal', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const dialog = modalFixture(t); let closing;
  dialog.addEventListener('modal:open', () => { closing = modal.hide('sample'); });
  const opening = modal.show('sample'); t.mock.timers.tick(10); await flush(); t.mock.timers.tick(200); await opening;
  assert.equal(dialog.classList.contains('modal_active'), false);
  t.mock.timers.tick(200); await closing;
  assert.equal(modal.lockCount, 0); assert.equal(modal.modalLevel, 0);
});

function dropdownFixture(t) {
  const parent = new FakeElement(); const trigger = new FakeElement('button'); const menu = new FakeElement('ul');
  parent.appendChild(trigger); parent.appendChild(menu);
  parent.selectors.set('[x-dropdown-open]', trigger);
  t.mock.method(lib, 'qsa', selector => selector === '[x-dropdown]' ? [menu] : []);
  dropdown.init(); return { parent, trigger, menu };
}
test('dropdown destroy cancels pending open/close, restores ARIA and permits reinit', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const {parent, trigger, menu} = dropdownFixture(t); let after = 0;
  parent.addEventListener('dropdown:aftershow', () => after++);
  parent.addEventListener('dropdown:afterhide', () => after++);
  const opening = dropdown._open(parent, trigger); dropdown.destroy(); await opening;
  t.mock.timers.tick(300); await flush();
  assert.equal(after, 0); assert.equal(parent.classList.contains('dropdown_open'), false);
  assert.equal(trigger.getAttribute('aria-controls'), null); assert.equal(menu.getAttribute('role'), null);
  dropdown.init(); const next = dropdown._open(parent, trigger); t.mock.timers.tick(20); await next;
  assert.equal(parent.classList.contains('dropdown_open'), true);
  const closing = dropdown._close(parent); dropdown.destroy(); await closing;
  t.mock.timers.tick(300); await flush();
  assert.equal(after, 1); assert.equal(parent.classList.contains('dropdown_ready'), false);
});

test('device destroy cancels queued breakpoint notification', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let calls=0;
  window.addEventListener('breakpointchange', () => calls++);
  device.init(); window.innerWidth=400; window.dispatchEvent(new Event('resize')); device.destroy();
  t.mock.timers.tick(300); assert.equal(calls,0);
});

test('animate removes pending load and animation-frame work; numeric end zero is preserved', t => {
  const el = new FakeElement(); el.isConnected = true; el.setAttribute('x-animate','{"start":100,"end":0,"functionName":"paint"}');
  el.getBoundingClientRect = () => ({top:50});
  t.mock.method(lib,'qsa',()=>[el]);
  const frames=new Map();let id=0,calls=0;
  window.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};
  window.cancelAnimationFrame=key=>frames.delete(key);
  window.paint=item=>{calls++;assert.equal(item.progress,.5);};
  document.readyState='loading'; animate.init(); animate.destroy(); window.dispatchEvent(new Event('load'));
  assert.equal(frames.size,0);
  document.readyState='complete';animate.init();assert.equal(frames.size,1);
  for(const [key,fn] of frames){frames.delete(key);fn();}
  assert.equal(calls,1);
  window.dispatchEvent(new Event('resize'));animate.destroy();assert.equal(frames.size,0);
});

test('sticky reinit applies new options, clears old classes and ignores stale observer', t => {
  const all=observers();const el=new FakeElement();el.classList.add('sticky');
  t.mock.method(lib,'qsa',()=>[el]);sticky.init();all[0].callback([{target:el,intersectionRatio:0}]);
  assert.equal(el.classList.contains('sticky_on'),true);
  sticky.rootMargin='-2px';sticky.init();
  assert.equal(all[0].disconnected,true);assert.equal(all[1].options.rootMargin,'-2px');
  assert.equal(el.classList.contains('sticky_on'),false);
  all[0].callback([{target:el,intersectionRatio:0}]);
  assert.equal(el.classList.contains('sticky_on'),false);
  sticky.destroy();sticky.rootMargin='-1px 0px 0px 0px';
});

test('appear once unobserves even without appearedClass', t => {
  const all=observers(); const el=new FakeElement();t.mock.method(lib,'qsa',()=>[el]);
  appear.init({once:true,appearedClass:''});all[0].callback([{target:el,isIntersecting:true}]);
  assert.equal(all[0].targets.size,0);appear.destroy();appear._options.appearedClass='appeared';appear._options.once=false;
});

test('lazyload destroy cancels pending preload and prevents late mutation', async () => {
  const images=[];
  globalThis.Image=class { constructor(){images.push(this);} removeAttribute(){} };
  const el=new FakeElement('img');el.setAttribute('data-src','/photo.jpg');
  lazyload._loadImage(el);const onload=images[0].onload;lazyload.destroy();onload();await flush();
  assert.equal(el.classList.contains('loaded'),false);assert.equal(el.getAttribute('data-src'),'/photo.jpg');
  assert.equal(images[0].onload,null);
});

test('loadmore preserves id, reset aborts pending page and re-observes stopped marker', async t => {
  const all=observers();const el=new FakeElement();el.id='feed';el.setAttribute('x-loadmore','{"functionName":"load"}');
  t.mock.method(lib,'qsa',()=>[el]);t.mock.method(lib,'qs',()=>el);
  let resolve,signal;
  window.load=(page,context)=>{assert.equal(page,1);signal=context.signal;return new Promise(r=>{resolve=r;});};
  loadmore.init();assert.equal(el.id,'feed');
  const pending=all[0].callback([{target:el,isIntersecting:true}],all[0]);
  loadmore.reset('#feed');assert.equal(signal.aborted,true);resolve(true);await pending;
  assert.equal(loadmore.items.feed.page,1);
  window.load=()=>false;await all[0].callback([{target:el,isIntersecting:true}],all[0]);assert.equal(all[0].targets.size,0);
  loadmore.reset('#feed');assert.equal(all[0].targets.has(el),true);
});

test('slider retains listeners during use, restores single slides and reuses observer', () => {
  const all=observers();globalThis.MutationObserver=window.MutationObserver=class{observe(){}disconnect(){}};
  const el=new FakeElement();const first=new FakeElement('article');const second=new FakeElement('article');
  el.appendChild(first);el.appendChild(second);let clicks=0;first.addEventListener('click',()=>clicks++);
  document.querySelectorAll=()=>[el];const slider=new Slider();slider.init();slider.observeSliders();assert.equal(all.length,1);
  all[0].callback([{target:el,isIntersecting:true}]);assert.equal(el.children[0].children[0],first);
  first.dispatchEvent(new Event('click'));assert.equal(clicks,1);slider.destroy();assert.equal(el.children[0],first);
  const solo=new FakeElement();const child=new FakeElement();solo.appendChild(child);slider.initSlider(solo);
  assert.equal(child.classList.contains('slider-item'),true);slider.destroy();assert.equal(child.classList.contains('slider-item'),false);
});

test('typograf live replaces a root subscription and old cleanup cannot remove its replacement', t => {
  const target=new FakeElement('input');target.type='text';target.matches=()=>true;target.setSelectionRange=()=>{};
  let calls=0;t.mock.method(typograf,'process',value=>{calls++;return value;});
  const old=typograf.live('.static','.live',document);typograf.live('.static','.live',document);old();
  const event=new Event('input');Object.defineProperty(event,'target',{value:target});document.dispatchEvent(event);
  assert.equal(calls,1);typograf.destroy(document);document.dispatchEvent(event);assert.equal(calls,1);
});

test('deferred cancellation also removes a queued load listener', t => {
  t.mock.timers.enable({apis:['setTimeout']});document.readyState='loading';let calls=0;
  const cancel=lib.deferred(()=>calls++,10);t.mock.timers.tick(10);cancel();window.dispatchEvent(new Event('load'));
  assert.equal(calls,0);
});

test('aggregate destroy allows a fresh init cycle', t => {
  let calls=0;for(const name of ['device','modal','animate','appear','lazyload','loadmore','sheets','dropdown','scroll','sticky','slider','hover']) t.mock.method(x[name],'init',()=>calls++);
  x.init();x.init();assert.equal(calls,12);x.destroy();x.init();assert.equal(calls,24);
});

test('scroll works before init and destroy settles waits and clears active classes', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const target = new FakeElement(), link = new FakeElement();
  x.scroll.parent = null;
  let scrolled = false;
  window.scrollTo = () => { scrolled = true; };
  const pending = x.scroll.scrollTo(target);
  assert.equal(scrolled, true);
  target.classList.add('active'); link.classList.add('active');
  x.scroll._linksHash = {one:{target, link, classActive:'active'}};
  x.scroll.destroy(); await pending;
  assert.equal(target.classList.contains('active'), false);
  assert.equal(link.classList.contains('active'), false);
});

test('nested sheets preserve child selection and register each trigger once', t => {
  const outer = new FakeElement(), inner = new FakeElement();
  const tab = new FakeElement('button'), body = new FakeElement();
  const childTab = new FakeElement('button'), childBody = new FakeElement();
  tab.setAttribute('x-sheet-open','outer'); childTab.setAttribute('x-sheet-open','inner');
  for (const el of [tab,body]) el.closestSelectors.set('[x-sheets]',outer);
  for (const el of [childTab,childBody]) el.closestSelectors.set('[x-sheets]',inner);
  childTab.classList.add('active'); childBody.classList.add('active');
  t.mock.method(lib,'qsa',(selector,root) => {
    if (selector === '[x-sheets]') return [outer,inner];
    const tabs = root === inner ? [childTab] : [tab,childTab];
    const bodies = root === inner ? [childBody] : [body,childBody];
    if (selector === '[x-sheet-open]') return tabs;
    if (selector === '[x-sheet]') return bodies;
    if (selector === '[x-sheet-open].active') return tabs.filter(el => el.classList.contains('active'));
    if (selector === '[x-sheet].active') return bodies.filter(el => el.classList.contains('active'));
    if (selector === '[x-sheet-open="outer"]') return [tab];
    if (selector === '[x-sheet="outer"]') return [body];
    if (selector === '[x-sheet-open="inner"]') return [childTab];
    if (selector === '[x-sheet="inner"]') return [childBody];
    return [];
  });
  x.sheets.init();
  assert.equal(x.sheets._handlers.size,2);
  x.sheets.show('outer',{container:outer});
  assert.equal(childTab.classList.contains('active'),true);
  assert.equal(childBody.classList.contains('active'),true);
  let selected=0; inner.addEventListener('sheets:selected',()=>selected++);
  x.sheets.init(); selected=0;
  childTab.dispatchEvent(new Event('click',{cancelable:true}));
  assert.equal(selected,1);
  x.sheets.destroy(); childTab.dispatchEvent(new Event('click'));
  assert.equal(selected,1);
});

test('hover destroy clears synchronized classes on detached targets', t => {
  const link = new FakeElement('a'); link.setAttribute('href','/same');
  link.closestSelectors.set('[x-hover]',link);
  t.mock.method(lib,'qsa',()=>[link]);
  x.hover.init(); x.hover._handleEnter({target:link});
  assert.equal(link.classList.contains('hover'),true);
  x.hover.destroy();
  assert.equal(link.classList.contains('hover'),false);
});

test('slider keeps one transition listener and ignores child transition events', () => {
  window.ontouchstart = null;
  const el = new FakeElement(), first = new FakeElement(), second = new FakeElement();
  el.appendChild(first); el.appendChild(second);
  const slider = new Slider(); slider.initSlider(el);
  const data = slider.instances.get(el), state = slider._originalStates.get(el);
  for (let i=0;i<25;i++) data.events.touchcancel();
  assert.equal(state.cleanups.size,1);
  const childEvent = new Event('transitionend');
  Object.defineProperty(childEvent,'target',{value:first});
  Object.defineProperty(childEvent,'propertyName',{value:'opacity'});
  data.wrapper.dispatchEvent(childEvent);
  assert.equal(state.cleanups.size,1);
  const ownEvent = new Event('transitionend');
  Object.defineProperty(ownEvent,'propertyName',{value:'transform'});
  data.wrapper.dispatchEvent(ownEvent);
  assert.equal(state.cleanups.size,0);
  slider.destroy();
});

test('loadmore accepts an existing id that matches an Object prototype key', async t => {
  loadmore.destroy();
  const all=observers(), el=new FakeElement();
  el.id='__proto__'; el.setAttribute('x-loadmore','{"functionName":"load"}');
  t.mock.method(lib,'qsa',()=>[el]);
  window.load=()=>true;
  loadmore.init();
  await all[0].callback([{target:el,isIntersecting:true}],all[0]);
  assert.equal(Object.getPrototypeOf(loadmore.items),null);
  assert.equal(loadmore.items.__proto__.page,2);
  loadmore.destroy(); assert.equal(Object.keys(loadmore.items).length,0);
});

test('onAppear exposes observer cleanup and deffered forwards cancellation', t => {
  const all=observers(), el=new FakeElement(); let called=0;
  t.mock.method(lib,'qsa',()=>[el]);
  const observer=lib.onAppear('.card',()=>called++);
  assert.equal(observer,all[0]);
  observer.callback([{target:el,isIntersecting:true}],observer);
  assert.equal(called,1);
  observer.disconnect(); assert.equal(observer.targets.size,0);
  t.mock.timers.enable({apis:['setTimeout']});
  const cancel=lib.deffered(()=>called++,10);
  cancel(); t.mock.timers.tick(20);
  assert.equal(called,1);
});

test('destroy wins after modal timer fires but before promise continuation', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const dialog=modalFixture(t); let opened=0;
  dialog.addEventListener('modal:open',()=>opened++);
  const pending=modal.show('sample'); t.mock.timers.tick(10); await flush();
  t.mock.timers.tick(200); modal.destroy(); await pending;
  assert.equal(opened,0); assert.equal(modal.lockCount,0);
});

test('destroy wins after dropdown timer fires but before promise continuation', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const {parent,trigger}=dropdownFixture(t); let shown=0;
  parent.addEventListener('dropdown:aftershow',()=>shown++);
  const pending=dropdown._open(parent,trigger); t.mock.timers.tick(20); dropdown.destroy(); await pending;
  assert.equal(shown,0); assert.equal(parent.classList.contains('dropdown_open'),false);
});

test('dropdown ready can destroy initialization without leaving handlers', t => {
  const {parent,menu}=dropdownFixture(t); dropdown.destroy();
  parent.addEventListener('dropdown:ready',()=>dropdown.destroy(),{once:true});
  dropdown.init();
  assert.equal(dropdown._initialized,false); assert.equal(dropdown._handlers.size,0);
  assert.equal(menu.getAttribute('role'),null);
  dropdown.init(); assert.equal(dropdown._initialized,true);
});

test('aggregate init stops when a component callback destroys it', t => {
  const called=[];
  const names=['device','modal','animate','appear','lazyload','loadmore','sheets','dropdown','scroll','sticky','slider','hover'];
  for(const name of names) t.mock.method(x[name],'init',()=>{called.push(name);if(name==='sheets')x.destroy();});
  x.init(); assert.equal(x.initialized,false);
  assert.deepEqual(called,names.slice(0,7));
});

test('appear stops the current observer batch when a visible callback destroys it', t => {
  const all=observers(), first=new FakeElement(), second=new FakeElement();
  t.mock.method(lib,'qsa',()=>[first,second]);
  appear.init({once:false,visibleClass:'visible',appearedClass:'appeared'});
  first.addEventListener('visible',()=>appear.destroy());
  all[0].callback([{target:first,isIntersecting:true},{target:second,isIntersecting:true}]);
  assert.equal(second.classList.contains('visible'),false);
});

test('slider releases detached pending targets and ignores queued intersections', () => {
  const all=observers(); let mutation;
  globalThis.MutationObserver=window.MutationObserver=class {constructor(cb){mutation=cb;}observe(){}disconnect(){}};
  const el=new FakeElement(); el.appendChild(new FakeElement());el.isConnected=true;
  document.querySelectorAll=()=>[el];
  const slider=new Slider();slider.init(); assert.equal(all[0].targets.has(el),true);
  el.isConnected=false;mutation([{addedNodes:[],removedNodes:[el]}]);
  assert.equal(all[0].targets.size,0); assert.equal(slider.sliders.length,0);
  all[0].callback([{target:el,isIntersecting:true}]);
  assert.equal(slider._originalStates.size,0);
  el.isConnected=true;el.setAttribute('x-slider','');mutation([{addedNodes:[el],removedNodes:[]}]);
  all[0].callback([{target:el,isIntersecting:true}]);
  assert.equal(slider._originalStates.size,1);slider.destroy();
});

test('sheets ready callback can destroy initialization and reinit later', t => {
  const container=new FakeElement(), tab=new FakeElement('button');
  tab.setAttribute('x-sheet-open','a');tab.closestSelectors.set('[x-sheets]',container);
  t.mock.method(lib,'qsa',selector=>selector==='[x-sheets]'?[container]:selector==='[x-sheet-open]'?[tab]:[]);
  container.addEventListener('sheets:ready',()=>x.sheets.destroy(),{once:true});
  x.sheets.init();assert.equal(x.sheets._initialized,false);assert.equal(x.sheets._handlers.size,0);
  x.sheets.init();assert.equal(x.sheets._handlers.size,1);
});

test('modal hideAll does not continue into a new lifecycle', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const first=new FakeElement(), second=new FakeElement();first.id='first';second.id='second';
  first.classList.add('modal_active');second.classList.add('modal_active');
  t.mock.method(lib,'qsa',selector=>selector==='.modal_active'?[first,second]:[]);
  t.mock.method(lib,'qs',selector=>selector==='#first'?first:selector==='#second'?second:document.documentElement);
  modal.init();modal._touched.add(first);modal._touched.add(second);
  const pending=modal.hideAll();modal.destroy();modal.init();
  // This open state belongs to the new lifecycle, not to the pending hideAll.
  second.classList.add('modal_active');await pending;
  assert.equal(second.classList.contains('modal_active'),true);
});

test('sticky reinit inside a callback ignores remaining old observer entries', t => {
  const all=observers(),first=new FakeElement(),second=new FakeElement();
  t.mock.method(lib,'qsa',()=>[first,second]);sticky.init();
  first.addEventListener('sticky:on',()=>sticky.init(),{once:true});
  all[0].callback([{target:first,intersectionRatio:0},{target:second,intersectionRatio:0}]);
  assert.equal(second.classList.contains(sticky.activeClass),false);
});

test('animate reinit during a callback does not process the new batch in the old frame', () => {
  const first=new FakeElement(),second=new FakeElement();first.isConnected=second.isConnected=true;
  let called=0;
  const replacement=[{element:second,trigger:second,parent:window,start:100,end:false,fn:()=>called++}];
  const item={element:first,trigger:first,parent:window,start:100,end:false,fn:()=>{animate._animations=replacement;}};
  animate._animations=[item,{...replacement[0]}];animate._scroll();
  assert.equal(called,0);animate._animations=[];
});

test('aggregate init failure clears partial setup and permits retry', t => {
  const names=['device','modal','animate','appear','lazyload','loadmore','sheets','dropdown','scroll','sticky','slider','hover'];
  for (const name of names) t.mock.method(x[name],'init',()=>{});
  t.mock.method(x.modal,'init',()=>{throw new Error('init failed');});
  assert.throws(()=>x.init(),/init failed/);assert.equal(x.initialized,false);
});
