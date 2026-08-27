export class FakeClassList {
  constructor(initial = []) {
    this.values = new Set(initial);
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

  toggle(name, force) {
    const enabled = force ?? !this.contains(name);
    if (enabled) this.add(name);
    else this.remove(name);
    return enabled;
  }
}

export class FakeElement extends EventTarget {
  constructor(tagName = 'div') {
    super();
    this.tagName = tagName.toUpperCase();
    this.nodeName = this.tagName;
    this.nodeType = 1;
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.dataset = {};
    this.style = {};
    this.children = [];
    this.parentElement = null;
    this.selectors = new Map();
    this.selectorLists = new Map();
    this.closestSelectors = new Map();
    this.id = '';
    this.value = '';
    this.checked = false;
    this.type = '';
    this.isContentEditable = false;
    this.offsetWidth = 100;
    this.clientHeight = 100;
    this.scrollTop = 0;
    this._innerHTML = '';
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    if (value === '') this.children = [];
  }

  get firstElementChild() {
    return this.children[0] ?? null;
  }

  getAttribute(name) {
    if (name === 'id') return this.id || null;
    if (name === 'class') return [...this.classList.values].join(' ');
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    if (name === 'id') this.id = String(value);
    else this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    if (name === 'id') this.id = '';
    else {
      this.attributes.delete(name);
      if (name.startsWith('data-')) {
        const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        delete this.dataset[key];
      }
    }
  }

  hasAttribute(name) {
    return this.getAttribute(name) != null;
  }

  querySelector(selector) {
    if (this.selectors.has(selector)) return this.selectors.get(selector);
    if (selector === 'img') return this.children.find(child => child.tagName === 'IMG') ?? null;
    return null;
  }

  querySelectorAll(selector) {
    if (this.selectorLists.has(selector)) return this.selectorLists.get(selector);
    if (selector === 'span') return this.children.filter(child => child.tagName === 'SPAN');
    return [];
  }

  closest(selector) {
    if (this.closestSelectors.has(selector)) return this.closestSelectors.get(selector);
    return null;
  }

  matches(selector) {
    if (selector === '[role="menuitem"]') return this.getAttribute('role') === 'menuitem';
    return false;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter(child => child !== this);
    this.parentElement = null;
  }

  cloneNode(deep = false) {
    const clone = new FakeElement(this.tagName);
    clone.attributes = new Map(this.attributes);
    clone.classList = new FakeClassList(this.classList.values);
    clone.dataset = { ...this.dataset };
    clone.offsetWidth = this.offsetWidth;
    if (deep) this.children.forEach(child => clone.appendChild(child.cloneNode(true)));
    return clone;
  }

  focus() {
    if (typeof document !== 'undefined') document.activeElement = this;
  }

  blur() {
    if (typeof document !== 'undefined' && document.activeElement === this) document.activeElement = null;
  }

  scrollTo() {}
  scrollIntoView() {}
  getBoundingClientRect() {
    return { top: 0, bottom: 100, left: 0, right: 100 };
  }
}

export class FakeDocument extends EventTarget {
  constructor() {
    super();
    this.documentElement = new FakeElement('html');
    this.body = new FakeElement('body');
    this.activeElement = null;
    this.readyState = 'complete';
    this.title = 'Test';
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [];
  }
}

export const keyEvent = key => {
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperty(event, 'key', { value: key });
  return event;
};

export const installDomGlobals = () => {
  const fakeDocument = new FakeDocument();
  const fakeWindow = new FakeElement('window');
  fakeWindow.innerWidth = 1024;
  fakeWindow.innerHeight = 768;
  fakeWindow.scrollY = 0;
  fakeWindow.pageYOffset = 0;
  fakeWindow.location = { hash: '', pathname: '/', search: '', href: 'http://localhost/' };
  fakeWindow.navigator = { userAgent: 'Mozilla/5.0 Chrome/120', platform: 'MacIntel' };
  fakeWindow.matchMedia = () => ({ matches: false });
  fakeWindow.setTimeout = setTimeout;
  fakeWindow.clearTimeout = clearTimeout;

  globalThis.document = fakeDocument;
  globalThis.window = fakeWindow;
  globalThis.Node = FakeElement;
  globalThis.Element = FakeElement;
  globalThis.HTMLElement = FakeElement;
  globalThis.NodeList = Array;
  globalThis.CSS = { escape: value => String(value).replace(/"/g, '\\"') };
  globalThis.history = { replaceState() {}, pushState() {} };
  return { document: fakeDocument, window: fakeWindow };
};

export const removeDomGlobals = () => {
  delete globalThis.document;
  delete globalThis.window;
  delete globalThis.Node;
  delete globalThis.Element;
  delete globalThis.HTMLElement;
  delete globalThis.NodeList;
  delete globalThis.CSS;
  delete globalThis.history;
  delete globalThis.IntersectionObserver;
  delete globalThis.MutationObserver;
  delete globalThis.navigator;
};
