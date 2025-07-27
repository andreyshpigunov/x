/**
 * @fileoverview Utility library for common frontend tasks.
 *
 * Public API:
 *
 * - DOM Selection:
 *   - `id(id)`
 *   - `qs(selector, context)`
 *   - `qsa(selector, context)`
 *
 * - Visibility & Classes:
 *   - `hide(selector)`
 *   - `show(selector)`
 *   - `toggle(selector)`
 *   - `addClass(selector, className, delay)`
 *   - `removeClass(selector, className, delay)`
 *   - `toggleClass(selector, className, delay)`
 *   - `switchClass(selector, className, condition, delay)`
 *
 * - Navigation & URL:
 *   - `reload()`
 *   - `reloadWithHash(hash)`
 *   - `redirectTo(url)`
 *   - `updateURL(url, title)`
 *
 * - Number & Formatting:
 *   - `random(a, b)`
 *   - `price(price)`
 *   - `number(num)`
 *   - `numberDecline(number, nominative, genitiveSingular, genitivePlural)`
 *
 * - Validation:
 *   - `isEmail(email)`
 *   - `isValidJSON(str)`
 *
 * - Utilities:
 *   - `makeId()`
 *   - `makePassword(length, selector)`
 *   - `loadScript(path, callback, type)`
 *   - `deferred(callback, delay)`
 *   - `deffered(callback, delay)` (alias)
 *   - `throttle(fn, wait, options)`
 *   - `debounce(fn, wait, options)`
 *   - `onAppear(selector, appearCallback, disappearCallback, options)`
 *   - `alertErrors(data)`
 *   - `printErrors(data)`
 *   - `render(selector, data, placement)`
 *   - `transitionsOn()`
 *   - `transitionsOff()`
 *   - `sleep(ms)`
 *
 * @author Andrey Shpigunov
 * @version 0.2
 * @since 2025-07-17
 */

class Lib {
  constructor() {
    /**
     * Stores loaded script URLs to prevent duplicate loading.
     * @type {string[]}
     * @private
     */
    this.loadedScripts = [];

    this._elementRender();
  }

  /**
   * Automatically renders elements with [x-render] on DOMContentLoaded.
   * @private
   */
  _elementRender() {
    document.addEventListener('DOMContentLoaded', () => {
      this.qsa('[x-render]').forEach(item => {
        this.render(item, eval(item.getAttribute('x-render')));
      });
    }, { once: true });
  }

  /**
   * Returns element by ID.
   * @param {string} id - Element ID.
   * @returns {HTMLElement|null}
   */
  id(id) {
    return document.getElementById(id);
  }

  /**
   * Returns first matching element or element itself.
   * @param {string|Node|NodeList|Array} selector - Selector or Node.
   * @param {HTMLElement|Document} [context=document] - Search context.
   * @returns {HTMLElement|null}
   */
  qs(selector, context = document) {
    if (!selector) return null;

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
   * Returns all matching elements as array.
   * @param {string|Node|NodeList|Array} selector - Selector or Node.
   * @param {HTMLElement|Document} [context=document] - Search context.
   * @returns {HTMLElement[]}
   */
  qsa(selector, context = document) {
    if (!selector) return [];

    if (typeof selector === 'string') return [...context.querySelectorAll(selector)];
    if (selector instanceof NodeList) return [...selector];
    if (selector instanceof Node) return [selector];
    if (Array.isArray(selector) && selector.length) {
      const arr = [];
      for (let item of selector) {
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
   * Adds class to elements with optional delay.
   * Adds `_ready` class before transition if delayed.
   *
   * @param {string|Node|NodeList|Array} selector
   * @param {string} className
   * @param {number} [delay=0] - Delay in ms.
   */
  async addClass(selector, className, delay = 0) {
    const items = this.qsa(selector);
    if (!items.length) return;

    if (delay > 0) {
      for (let i of items) i.classList.add(className.replace(/_.*/, '') + '_ready');
      await new Promise(res => setTimeout(res, delay));
    }

    for (let i of items) i.classList.add(className);
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
    if (!items.length) return;

    for (let i of items) i.classList.remove(className);

    if (delay > 0) {
      await new Promise(res => setTimeout(res, delay));
      for (let i of items) i.classList.remove(className.replace(/_.*/, '') + '_ready');
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
    for (let i of items) {
      if (i.classList.contains(className)) {
        await this.removeClass(i, className, delay);
      } else {
        await this.addClass(i, className, delay);
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
   * Reloads the page.
   */
  reload() {
    location.reload();
  }

  /**
   * Reloads page with new hash.
   * @param {string} hash
   */
  reloadWithHash(hash) {
    location.hash = hash;
    this.reload();
  }

  /**
   * Redirects to given URL.
   * @param {string} url
   */
  redirectTo(url) {
    location.href = url;
  }

  /**
   * Updates browser URL without reload.
   * @param {string} url
   * @param {string} [title]
   */
  updateURL(url, title) {
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
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  /**
   * Validates JSON string.
   * @param {string} str
   * @returns {boolean}
   */
  isValidJSON(str) {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
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
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#^$%^&*()-+:,.;_';
    let password = Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    if (selector) {
      this.qs(selector).value = password;
    } else {
      return password;
    }
  }

  /**
   * Loads external JS script once.
   * @param {string} path
   * @param {Function} callback
   * @param {string} [type='async']
   */
  loadScript(path, callback, type = 'async') {
    if (!this.loadedScripts.includes(path)) {
      const script = document.createElement('script');
      script.onload = callback;
      script.onerror = () => console.error(`Failed to load script: ${path}`);
      script.src = path;
      if (type) script.setAttribute(type, '');
      document.body.appendChild(script);
      this.loadedScripts.push(path);
    } else {
      callback();
    }
  }

  /**
   * Defers function execution by user activity or timeout.
   * @param {Function} callback
   * @param {number} [delay=10000]
   */
  deferred(callback, delay = 10000) {
    const events = ['scroll', 'resize', 'click', 'keydown', 'mousemove', 'touchmove'];
    let timer;

    const run = () => {
      events.forEach(e => window.removeEventListener(e, run, { once: true }));
      if (document.readyState === 'complete') callback();
      else window.addEventListener('load', callback, { once: true });
      clearTimeout(timer);
    };

    timer = setTimeout(run, delay);
    events.forEach(e => window.addEventListener(e, run, { once: true }));
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
    // (реализация см выше - она ок, оставить как есть)
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
    // (реализация см выше - она ок, оставить как есть)
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
    const elements = this.qsa(selector);
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          appearCallback(entry.target);
          if (!disappearCallback) obs.unobserve(entry.target);
        } else if (disappearCallback) {
          disappearCallback(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '200px',
      threshold: 0.1,
      ...options
    });

    elements.forEach(el => observer.observe(el));
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
   * @param {string|Object} data
   * @returns {string}
   */
  printErrors(data) {
    if (!data) return '';
    if (typeof data === 'string') {
      return `<div>${data}</div>`;
    } else {
      return Object.entries(data)
        .map(([key, val]) => `<div class="error_${key}">${val}</div>`)
        .join('\n');
    }
  }

  /**
   * Renders content into elements.
   * @param {string|Node|NodeList|Array} selector
   * @param {string|Function|Promise} data
   * @param {InsertPosition|null} [placement=null]
   */
  async render(selector, data, placement = null) {
    const items = this.qsa(selector);
    if (!items.length) return;

    const content = typeof data === 'function' ? await data() : data;

    for (let el of items) {
      if (placement == null) {
        el.innerHTML = content;
      } else {
        el.insertAdjacentHTML(placement, content);
      }
    }
  }

  /**
   * Enables CSS transitions globally.
   */
  transitionsOn(delay = 0) {
    setTimeout(() => {
      document.documentElement.classList.remove('noTransitions')
    }, delay);
  }

  /**
   * Disables CSS transitions globally.
   */
  transitionsOff() {
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
