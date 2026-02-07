/**
 * @fileoverview Comprehensive utility library for common frontend tasks.
 *
 * Provides a wide range of utilities for DOM manipulation, formatting, validation, event handling,
 * and more. All methods are available through the singleton `lib` instance.
 *
 * Exported singleton: `lib`
 *
 * Usage:
 *
 *   import { lib } from './lib.js';
 *
 *   // DOM selection
 *   const element = lib.qs('.my-class');
 *   const elements = lib.qsa('.my-class');
 *
 *   // Classes and visibility
 *   await lib.addClass('.element', 'active');
 *   lib.hide('.element');
 *   lib.show('.element');
 *
 *   // Formatting
 *   lib.price(1234.56);        // "1 234.56"
 *   lib.number(1234567);       // "1 234 567"
 *
 *   // Validation
 *   lib.isEmail('user@mail.com'); // true
 *
 *   // Utilities
 *   lib.makeId();              // "id123456"
 *   lib.sleep(1000);           // Promise that resolves after 1 second
 *
 * Public API Categories:
 *
 * DOM Selection:
 *   - id(id) - Get element by ID
 *   - qs(selector, context) - Get first matching element
 *   - qsa(selector, context) - Get all matching elements as array
 *
 * Visibility & Classes:
 *   - hide(selector) - Hide elements (adds .hidden class)
 *   - show(selector) - Show elements (removes .hidden class)
 *   - toggle(selector) - Toggle .hidden class
 *   - switch(selector, condition) - Show/hide based on condition
 *   - addClass(selector, className, delay) - Add class with optional delay
 *   - removeClass(selector, className, delay) - Remove class with optional delay
 *   - toggleClass(selector, className, delay) - Toggle class
 *   - switchClass(selector, className, condition, delay) - Add/remove class based on condition
 *
 * Navigation & URL:
 *   - reload() - Reload current page
 *   - reloadWithHash(hash) - Reload page with hash
 *   - redirectTo(url) - Redirect to URL
 *   - updateURL(url, title) - Update URL without reload (pushState)
 *
 * Number & Formatting:
 *   - random(a, b) - Random integer between a and b
 *   - price(price) - Format price with thin spaces
 *   - number(num) - Format number with thin spaces
 *   - numberDecline(number, nominative, genitiveSingular, genitivePlural) - Russian declension
 *
 * Validation:
 *   - isEmail(email) - Validate email format
 *   - isValidJSON(str) - Validate JSON string
 *   - isInteger(value) - Check if value is integer
 *   - isDouble(value) - Check if value is number
 *
 * Utilities:
 *   - makeId() - Generate random ID
 *   - makePassword(length, selector) - Generate password
 *   - loadScript(path, callback, type) - Load external script once
 *   - deferred(callback, delay) - Defer execution until user activity or timeout
 *   - deffered(callback, delay) - Alias for deferred
 *   - throttle(fn, wait, options) - Throttle function execution
 *   - debounce(fn, wait, options) - Debounce function execution
 *   - onAppear(selector, appearCallback, disappearCallback, options) - Watch elements with IntersectionObserver
 *   - alertErrors(data) - Alert error messages
 *   - printErrors(data) - Return HTML for errors
 *   - render(selector, data, placement) - Render content into elements
 *   - transitionsOn(delay) - Enable CSS transitions globally
 *   - transitionsOff() - Disable CSS transitions globally
 *   - sleep(ms) - Wait for specified time
 *
 * Examples:
 *
 * DOM Selection:
 *   const btn = lib.qs('.button');
 *   const allButtons = lib.qsa('.button');
 *   const container = lib.qs('.container');
 *   const items = lib.qsa('li', container);
 *
 * Classes with delay (for transitions):
 *   await lib.addClass('.element', 'active', 100); // Adds --ready class, waits 100ms, then adds active
 *   await lib.removeClass('.element', 'active', 200); // Removes active, waits 200ms, removes --ready
 *
 * Formatting:
 *   lib.price(1234.56);        // "1 234.56"
 *   lib.price(1000);          // "1 000"
 *   lib.number(1234567);      // "1 234 567"
 *   lib.numberDecline(1, 'товар', 'товара', 'товаров'); // "товар"
 *   lib.numberDecline(5, 'товар', 'товара', 'товаров'); // "товаров"
 *
 * Throttle and Debounce:
 *   const throttledScroll = lib.throttle(() => {
 *     console.log('Scrolled');
 *   }, 100);
 *   window.addEventListener('scroll', throttledScroll);
 *
 *   const debouncedSearch = lib.debounce((query) => {
 *     console.log('Search:', query);
 *   }, 300);
 *   input.addEventListener('input', (e) => debouncedSearch(e.target.value));
 *
 * IntersectionObserver:
 *   lib.onAppear('.lazy-element', (element) => {
 *     console.log('Element appeared:', element);
 *   });
 *
 * Render content:
 *   lib.render('.container', '<div>Content</div>');
 *   lib.render('.container', '<div>Before</div>', 'beforebegin');
 *   await lib.render('.container', async () => {
 *     const data = await fetchData();
 *     return data.html;
 *   });
 *
 * Auto-render elements with [x-render]:
 *   <div x-render="'Hello World'"></div>
 *   Automatically renders on DOMContentLoaded
 *
 * SECURITY WARNINGS:
 *
 * 1. eval() in _elementRender():
 *    - The [x-render] attribute uses eval() which can execute arbitrary code
 *    - Only use with trusted content or consider using data attributes instead
 *    - Example: <div data-render="text">Hello</div> and read with getAttribute('data-render')
 *
 * 2. innerHTML/insertAdjacentHTML in render():
 *    - These methods can execute scripts if HTML contains <script> tags
 *    - Use escapeHtml=true parameter or textContent for untrusted content
 *    - Example: lib.render('.element', userInput, null, true) // escapes HTML
 *
 * 3. loadScript():
 *    - Only load scripts from trusted domains
 *    - Validate URLs before calling
 *    - Consider using Content Security Policy (CSP) headers
 *
 * 4. printErrors():
 *    - Now automatically escapes HTML to prevent XSS
 *    - Safe to use with user input
 *
 * Best practices:
 *   - Always validate and sanitize user input
 *   - Use textContent instead of innerHTML when possible
 *   - Use the escapeHtml parameter in render() for untrusted content
 *   - Implement Content Security Policy (CSP) headers
 *   - Consider using a proper HTML sanitization library for complex cases
 *
 * Next.js: DOM methods no-op or return safe defaults when document/window undefined. Use lib on client (e.g. useEffect).
 *
 * @author Andrey Shpigunov
 * @version 0.3
 * @since 2026-02-02
 */

const HAS_DOM = () => typeof document !== 'undefined' && typeof window !== 'undefined';

class Lib {
  constructor() {
    /** @type {Set<string>} @private */
    this.loadedScripts = new Set();
    if (HAS_DOM()) this._elementRender();
  }

  /**
   * Renders [x-render] on DOMContentLoaded. SECURITY: uses eval(). SSR-safe: no-op when document undefined.
   * @private
   */
  _elementRender() {
    if (!HAS_DOM()) return;
    document.addEventListener('DOMContentLoaded', () => {
      const elements = this.qsa('[x-render]');
      for (let i = 0; i < elements.length; i++) {
        const item = elements[i];
        try {
          const expression = item.getAttribute('x-render');
          if (expression) {
            const value = eval(expression);
            this.render(item, value);
          }
        } catch (_) {}
      }
    }, { once: true });
  }

  /**
   * Escapes HTML special characters to prevent XSS. SSR-safe: uses string replace when no document.
   * @param {string} text
   * @returns {string}
   * @private
   */
  _escapeHtml(text) {
    if (text == null) return '';
    const s = String(text);
    if (HAS_DOM()) {
      const div = document.createElement('div');
      div.textContent = s;
      return div.innerHTML;
    }
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Returns element by ID. SSR-safe: returns null when document is undefined.
   * @param {string} id
   * @returns {HTMLElement|null}
   */
  id(id) {
    if (!HAS_DOM()) return null;
    return document.getElementById(id);
  }

  /**
   * Returns first matching element or element itself. SSR-safe: returns null when document undefined.
   * @param {string|Node|NodeList|Array} selector
   * @param {HTMLElement|Document} [context=document]
   * @returns {HTMLElement|null}
   */
  qs(selector, context = document) {
    if (!selector) return null;
    if (!HAS_DOM()) return selector instanceof Node ? selector : null;

    if (typeof selector === 'string') return context.querySelector(selector);
    if (selector instanceof Node) return selector;
    if (selector instanceof NodeList) return selector.length ? selector[0] : null;
    if (Array.isArray(selector) && selector.length) {
      return selector[0] instanceof Node ? selector[0] : context.querySelector(selector[0]);
    }
    if (selector === window) return selector;
    return null;
  }

  /**
   * Returns all matching elements as array. SSR-safe: returns [] when document undefined.
   * @param {string|Node|NodeList|Array} selector
   * @param {HTMLElement|Document} [context=document]
   * @returns {HTMLElement[]}
   */
  qsa(selector, context = document) {
    if (!selector) return [];
    if (!HAS_DOM()) return selector instanceof Node ? [selector] : [];

    if (typeof selector === 'string') return Array.from(context.querySelectorAll(selector));
    if (selector instanceof NodeList) return Array.from(selector);
    if (selector instanceof Node) return [selector];
    if (Array.isArray(selector) && selector.length) {
      const arr = [];
      for (let i = 0; i < selector.length; i++) {
        const item = selector[i];
        if (item instanceof Node) arr.push(item);
        else if (item instanceof NodeList) arr.push(...item);
        else arr.push(...context.querySelectorAll(item));
      }
      return arr.flat();
    }
    if (selector === window) return [selector];
    return [];
  }

  /**
   * Hides elements by adding `.hidden` class.
   * @param {string|Node|NodeList|Array} selector
   */
  async hide(selector) {
    await this.addClass(selector, 'hidden');
  }

  /**
   * Shows elements by removing `.hidden` class.
   * @param {string|Node|NodeList|Array} selector
   */
  async show(selector) {
    await this.removeClass(selector, 'hidden');
  }

  /**
   * Toggles `.hidden` class on elements.
   * @param {string|Node|NodeList|Array} selector
   */
  async toggle(selector) {
    await this.toggleClass(selector, 'hidden');
  }
  
  /**
   * Switches `.hidden` class based on condition.
   *
   * @param {string|Node|NodeList|Array} selector
   * @param {boolean} condition
   */
  async switch(selector, condition) {
    if (condition) {
      await this.removeClass(selector, 'hidden');
    } else {
      await this.addClass(selector, 'hidden');
    }
  }

  /**
   * Adds class to elements with optional delay.
   * Adds `_ready` class before transition if delayed.
   *
   * @param {string|Node|NodeList|Array} selector
   * @param {string} className
   * @param {number} [delay=0] - Delay in ms.
   */
  async addClass(selector, className, delay = 0) {
    const items = this.qsa(selector);
    const len = items.length;
    if (!len) return;

    if (delay > 0) {
      const readyClass = className.replace(/--.*/, '') + '--ready';
      for (let i = 0; i < len; i++) items[i].classList.add(readyClass);
      await new Promise(res => setTimeout(res, delay));
    }

    for (let i = 0; i < len; i++) items[i].classList.add(className);
  }

  /**
   * Removes class from elements with optional delay.
   *
   * @param {string|Node|NodeList|Array} selector
   * @param {string} className
   * @param {number} [delay=0]
   */
  async removeClass(selector, className, delay = 0) {
    const items = this.qsa(selector);
    const len = items.length;
    if (!len) return;

    for (let i = 0; i < len; i++) items[i].classList.remove(className);

    if (delay > 0) {
      await new Promise(res => setTimeout(res, delay));
      const readyClass = className.replace(/--.*/, '') + '--ready';
      for (let i = 0; i < len; i++) items[i].classList.remove(readyClass);
    }
  }

  /**
   * Toggles class on elements.
   *
   * @param {string|Node|NodeList|Array} selector
   * @param {string} className
   * @param {number} [delay=0]
   */
  async toggleClass(selector, className, delay = 0) {
    const items = this.qsa(selector);
    const len = items.length;
    for (let j = 0; j < len; j++) {
      const el = items[j];
      if (el.classList.contains(className)) {
        await this.removeClass(el, className, delay);
      } else {
        await this.addClass(el, className, delay);
      }
    }
  }

  /**
   * Switches class based on condition.
   *
   * @param {string|Node|NodeList|Array} selector
   * @param {string} className
   * @param {boolean} condition
   * @param {number} [delay=0]
   */
  async switchClass(selector, className, condition, delay = 0) {
    if (condition) {
      await this.addClass(selector, className, delay);
    } else {
      await this.removeClass(selector, className, delay);
    }
  }

  /**
   * Reloads the page. SSR-safe: no-op when window undefined.
   */
  reload() {
    if (typeof window === 'undefined') return;
    location.reload();
  }

  /**
   * Reloads page with new hash. SSR-safe: no-op when window undefined.
   * @param {string} hash
   */
  reloadWithHash(hash) {
    if (typeof window === 'undefined') return;
    location.hash = hash;
    this.reload();
  }

  /**
   * Redirects to given URL. SSR-safe: no-op when window undefined.
   * @param {string} url
   */
  redirectTo(url) {
    if (typeof window === 'undefined') return;
    location.href = url;
  }

  /**
   * Updates browser URL without reload. SSR-safe: no-op when window undefined.
   * @param {string} url
   * @param {string} [title]
   */
  updateURL(url, title) {
    if (typeof window === 'undefined') return;
    if (history.pushState) {
      history.pushState(null, title, url);
    } else {
      location.href = url;
    }
  }

  /**
   * Returns random integer between a and b.
   * @param {number} a
   * @param {number} b
   * @returns {number}
   */
  random(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  /**
   * Formats price with thin spaces.
   * @param {number|string} price
   * @returns {string}
   */
  price(price) {
    let p = parseFloat(price).toFixed(2);
    return p.replace(/\d(?=(\d{3})+\.)/g, '$& ').replace('.00', '');
  }

  /**
   * Formats number with thin spaces.
   * @param {number|string} num
   * @returns {string}
   */
  number(num) {
    const parts = (num + '').split('.');
    parts[0] = parts[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');
    return parts.join('.');
  }

  /**
   * Returns correct word form for number.
   * @param {number} number
   * @param {string} nominative
   * @param {string} genitiveSingular
   * @param {string} genitivePlural
   * @returns {string}
   */
  numberDecline(number, nominative, genitiveSingular, genitivePlural) {
    if (number > 10 && Math.floor((number % 100) / 10) === 1) return genitivePlural;
    switch (number % 10) {
      case 1: return nominative;
      case 2:
      case 3:
      case 4: return genitiveSingular;
      default: return genitivePlural;
    }
  }

  /**
   * Validates email.
   * @param {string} email
   * @returns {boolean}
   */
  isEmail(email) {
    if (typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  }

  /**
   * Validates JSON string.
   * @param {string} str
   * @returns {boolean}
   */
  isValidJSON(str) {
    if (typeof str !== 'string') return false;
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Validate integer
   * @param {string|number} value
   * @returns {boolean}
   */
  isInteger(value) {
    const num = Number(value);
    return Number.isInteger(num);
  }
  
  /**
   * Validate double
   * @param {string|number} value
   * @returns {boolean}
   */
  isDouble(value) {
    const num = Number(value);
    return !isNaN(num) && typeof num === 'number';
  }

  /**
   * Generates random ID.
   * @returns {string}
   */
  makeId() {
    return 'id' + this.random(100000, 999999);
  }

  /**
   * Generates password and sets to field if selector is provided.
   * @param {number} [length=8]
   * @param {string} [selector]
   * @returns {string|undefined}
   */
  makePassword(length = 8, selector) {
    if (length < 1) length = 8;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#^$%^&*()-+:,.;_';
    let password = '';
    for (let i = 0; i < length; i++) password += chars[Math.floor(Math.random() * chars.length)];

    if (selector) {
      const field = this.qs(selector);
      if (field && 'value' in field) field.value = password;
      return;
    }
    return password;
  }

  /**
   * Loads external JS script once.
   * SECURITY WARNING: Only load scripts from trusted sources. Validate URLs to prevent XSS.
   * @param {string} path - Script URL (must be from trusted domain)
   * @param {Function} callback - Callback function
   * @param {string} [type='async'] - Script type attribute
   */
  loadScript(path, callback, type = 'async') {
    if (!HAS_DOM() || !path || typeof callback !== 'function') return;

    try {
      if (typeof path === 'string' && path.startsWith('http')) {
        const url = new URL(path, window.location.href);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
      }
    } catch (_) {
      if (!path.startsWith('/') && !path.startsWith('./') && !path.startsWith('../')) return;
    }

    if (this.loadedScripts.has(path)) {
      callback();
      return;
    }

    try {
      const script = document.createElement('script');
      script.onload = callback;
      script.onerror = () => this.loadedScripts.delete(path);
      script.src = path;
      if (type) script.setAttribute(type, '');
      script.crossOrigin = 'anonymous';
      document.body.appendChild(script);
      this.loadedScripts.add(path);
    } catch (_) {}
  }

  /**
   * Defers function execution by user activity or timeout. SSR-safe: no-op when window undefined.
   * @param {Function} callback
   * @param {number} [delay=10000]
   */
  deferred(callback, delay = 10000) {
    if (typeof window === 'undefined') return;
    const events = ['scroll', 'resize', 'click', 'keydown', 'mousemove', 'touchmove'];
    let timer;

    const run = () => {
      for (let i = 0; i < events.length; i++) window.removeEventListener(events[i], run, { once: true });
      if (document.readyState === 'complete') callback();
      else window.addEventListener('load', callback, { once: true });
      clearTimeout(timer);
    };

    timer = setTimeout(run, delay);
    for (let i = 0; i < events.length; i++) window.addEventListener(events[i], run, { once: true });
  }

  /**
   * Alias for deferred().
   * @param {Function} callback
   * @param {number} [delay=10000]
   */
  deffered(callback, delay = 10000) {
    return this.deferred(callback, delay);
  }

  /**
   * Creates throttled version of function.
   * @param {Function} fn
   * @param {number} wait
   * @param {Object} [options]
   * @returns {Function}
   */
  throttle(fn, wait, options = {}) {
    return this._throttle(fn, wait, options);
  }

  /**
   * Creates debounced version of function.
   * @param {Function} fn
   * @param {number} wait
   * @param {Object} [options]
   * @returns {Function}
   */
  debounce(fn, wait, options = {}) {
    return this._debounce(fn, wait, options);
  }

  /**
   * Watches elements with IntersectionObserver.
   * @param {string} selector
   * @param {Function} appearCallback
   * @param {Function} [disappearCallback]
   * @param {Object} [options]
   */
  onAppear(selector, appearCallback, disappearCallback = null, options = {}) {
    if (!HAS_DOM() || typeof appearCallback !== 'function') return;
    if (!('IntersectionObserver' in window)) return;

    const elements = this.qsa(selector);
    const len = elements.length;
    if (!len) return;

    const observer = new IntersectionObserver((entries, obs) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.isIntersecting) {
          appearCallback(entry.target);
          if (!disappearCallback) obs.unobserve(entry.target);
        } else if (disappearCallback) {
          disappearCallback(entry.target);
        }
      }
    }, { root: null, rootMargin: '200px', threshold: 0.1, ...options });

    for (let i = 0; i < len; i++) observer.observe(elements[i]);
  }

  /**
   * Alerts error messages.
   * @param {string|Object} data
   */
  alertErrors(data) {
    if (!data) return;
    if (typeof data === 'string') {
      alert(data);
    } else {
      alert(Object.values(data).join('\n'));
    }
  }

  /**
   * Returns HTML for error messages.
   * SECURITY: Escapes HTML to prevent XSS attacks.
   * @param {string|Object} data
   * @returns {string}
   */
  printErrors(data) {
    if (!data) return '';
    if (typeof data === 'string') {
      return `<div>${this._escapeHtml(data)}</div>`;
    } else {
      return Object.entries(data)
        .map(([key, val]) => {
          const safeKey = this._escapeHtml(String(key));
          const safeVal = this._escapeHtml(String(val));
          return `<div class="error_${safeKey}">${safeVal}</div>`;
        })
        .join('\n');
    }
  }

  /**
   * Renders content into elements.
   * SECURITY WARNING: This method uses innerHTML/insertAdjacentHTML which can execute scripts.
   * Only use with trusted content. For untrusted content, use textContent or sanitize HTML first.
   * @param {string|Node|NodeList|Array} selector
   * @param {string|Function|Promise} data
   * @param {InsertPosition|null} [placement=null]
   * @param {boolean} [escapeHtml=false] - If true, escapes HTML to prevent XSS (uses textContent)
   */
  async render(selector, data, placement = null, escapeHtml = false) {
    if (!selector) return;
    const items = this.qsa(selector);
    const len = items.length;
    if (!len) return;

    try {
      const content = typeof data === 'function' ? await data() : data;
      const text = String(content || '');

      for (let i = 0; i < len; i++) {
        const el = items[i];
        if (escapeHtml) {
          if (placement == null) {
            el.textContent = text;
          } else {
            const textNode = document.createTextNode(text);
            if (placement === 'beforebegin') el.parentNode?.insertBefore(textNode, el);
            else if (placement === 'afterbegin') el.insertBefore(textNode, el.firstChild);
            else if (placement === 'beforeend') el.appendChild(textNode);
            else if (placement === 'afterend') el.parentNode?.insertBefore(textNode, el.nextSibling);
          }
        } else {
          if (placement == null) el.innerHTML = text;
          else el.insertAdjacentHTML(placement, text);
        }
      }
    } catch (_) {}
  }

  /**
   * Enables CSS transitions globally. SSR-safe: no-op when document undefined.
   */
  transitionsOn(delay = 0) {
    if (!HAS_DOM()) return;
    setTimeout(() => document.documentElement.classList.remove('noTransitions'), delay);
  }

  /**
   * Disables CSS transitions globally. SSR-safe: no-op when document undefined.
   */
  transitionsOff() {
    if (!HAS_DOM()) return;
    document.documentElement.classList.add('noTransitions');
  }

  /**
   * Waits for specified time.
   * @param {number} ms
   * @returns {Promise<void>}
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Creates throttled version of function.
   * Executes at most once per wait period.
   *
   * @param {Function} fn
   * @param {number} wait
   * @param {Object} [options]
   * @param {boolean} [options.leading=true]
   * @param {boolean} [options.trailing=true]
   * @returns {Function}
   * @private
   */
  _throttle(fn, wait, options = {}) {
    let timeoutId = null;
    let lastArgs = null;
    let lastContext = null;
    let lastCallTime = 0;
    const { leading = true, trailing = true } = options;
  
    const invoke = (time) => {
      lastCallTime = time;
      fn.apply(lastContext, lastArgs);
      lastArgs = lastContext = null;
    };
  
    const throttled = function (...args) {
      const now = Date.now();
      if (!lastCallTime && !leading) lastCallTime = now;
  
      lastArgs = args;
      lastContext = this;
  
      const remaining = wait - (now - lastCallTime);
      if (remaining <= 0 || remaining > wait) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;
        invoke(now);
      } else if (!timeoutId && trailing) {
        timeoutId = setTimeout(() => {
          timeoutId = null;
          if (trailing && lastArgs) invoke(Date.now());
        }, remaining);
      }
    };
  
    throttled.cancel = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = lastArgs = lastContext = null;
      lastCallTime = 0;
    };
  
    return throttled;
  }
  
  /**
   * Creates debounced version of function.
   * Executes after inactivity period.
   *
   * @param {Function} fn
   * @param {number} wait
   * @param {Object} [options]
   * @param {boolean} [options.leading=false]
   * @param {boolean} [options.trailing=true]
   * @returns {Function}
   * @private
   */
  _debounce(fn, wait, options = {}) {
    let timeoutId = null;
    let lastArgs = null;
    let lastContext = null;
    const { leading = false, trailing = true } = options;
  
    const invoke = () => {
      fn.apply(lastContext, lastArgs);
      lastArgs = lastContext = null;
    };
  
    const debounced = function (...args) {
      lastArgs = args;
      lastContext = this;
  
      if (timeoutId) clearTimeout(timeoutId);
  
      const shouldCallNow = leading && !timeoutId;
      if (shouldCallNow) {
        invoke();
      }
  
      timeoutId = setTimeout(() => {
        timeoutId = null;
        if (trailing && lastArgs) invoke();
      }, wait);
    };
  
    debounced.cancel = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = lastArgs = lastContext = null;
    };
  
    return debounced;
  }
}

export const lib = new Lib();
