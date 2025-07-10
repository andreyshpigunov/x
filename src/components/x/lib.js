//
//  lib.js / x
//  Utility Library for DOM, UI, and Web Helpers
//
//  Created by Andrey Shpigunov on 12.04.2025
//  All rights reserved.
//
//  This utility library provides reusable methods for:
//  - DOM selection and manipulation
//  - Element visibility and transitions
//  - Class toggling with delay support
//  - Page navigation and URL control
//  - Number formatting and pluralization
//  - Data validation (email, JSON)
//  - Unique ID/password generation
//  - Script loading and deferred actions
//  - Scroll/resize throttle
//  - Lazy element appearance detection
//  - Error displaying
//  - DOM rendering utilities
//
//  Available methods:
//    qs(selector, context)
//    qsa(selector, context)
//    hide(selector)
//    show(selector)
//    toggle(selector)
//    addClass(selector, className, delay)
//    removeClass(selector, className, delay)
//    toggleClass(selector, className, delay)
//    switchClass(selector, condition, className, delay)
//    reload()
//    reloadWithHash(hash)
//    redirectTo(url)
//    updateURL(url, title)
//    random(a, b)
//    price(price)
//    number(num)
//    numberDecline(number, nominative, genitiveSingular, genitivePlural)
//    isEmail(email)
//    isValidJSON(str)
//    makeId()
//    makePassword(length, selector)
//    loadScript(path, callback, type)
//    deferred(callback, delay)
//    deffered(callback, delay) [alias]
//    throttle(func, limit)
//    onAppear(selector, appearCallback, disappearCallback, options)
//    alertErrors(data)
//    printErrors(data)
//    render(selector, data, placement)
//    transitionsOn()
//    transitionsOff()
//    async sleep(ms)
//

class Lib {
  constructor() {
    this.loadedScripts = [];
    this._elementRender();
  }

  /**
   * Automatically renders content into elements with [x-render] attribute.
   * Executes after DOM is loaded.
   */
  _elementRender() {
    document.addEventListener('DOMContentLoaded', () => {
      this.qsa('[x-render]').forEach(item => {
        this.render(item, eval(item.getAttribute('x-render')));
      });
    });
  }

  // ---------- DOM Selection ----------
  

  /** Returns a single element by id or the element itself */
  id(id) {
    return document.getElementById(id);
  }

  /** Returns a single element by selector or the element itself */
  // qs('.item')
  // qs(qs('.item))
  // qs(qsa('.items)) - select first item
  // qs(['.item-1',...]) - select first item
  qs(selector, context = document) {
    if (!selector) return null;
  
    if (typeof selector === 'string') {
      return context.querySelector(selector);
    }
    if (selector instanceof Node) {
      return selector;
    }
    if (selector instanceof NodeList) {
      return selector.length ? selector[0] : null;
    }
    if (Array.isArray(selector)) {
      return selector.length ? context.querySelector(selector[0]) : null;
    }
    if (selector === window) {
      return selector;
    }
    return null;
  }

  /** Returns all matched elements as NodeList or array */
  // qs('.items')
  // qs(qsa('.items))
  // qs(qs('.item)) -> array
  // qs(['.item-1',...])
  qsa(selector, context = document) {
    if (!selector) return null;
  
    if (typeof selector === 'string') {
      return context.querySelectorAll(selector);
    }
    if (selector instanceof NodeList) {
      return selector;
    }
    if (selector instanceof Node) {
      return [selector];
    }
    if (Array.isArray(selector)) {
      const validSelectors = selector.filter(s => typeof s === 'string');
      return validSelectors.length ? context.querySelectorAll(validSelectors.join(',')) : null;
    }
    if (selector === window) {
      return [selector];
    }
    return null;
  }

  // ---------- Visibility ----------

  /** Adds .hidden class to element(s) */
  async hide(selector) {
    await this.addClass(selector, 'hidden');
  }

  /** Removes .hidden class from element(s) */
  async show(selector) {
    await this.removeClass(selector, 'hidden');
  }

  /** Toggles .hidden class on element(s) */
  async toggle(selector) {
    await this.toggleClass(selector, 'hidden');
  }
  
  // If need context, use:
  // hide(qs('.item', context))
  // show(qs('.item', context))
  // toggle(qs('.item', context))

  // ---------- Class Handling ----------

  /**
   * Adds className to element(s) with optional delay.
   * If delay is used, adds "_ready" class before applying main class.
   */
  async addClass(selector, className, delay = 0) {
    let items = this.qsa(selector);
    if (!items || !items.length) return;
    if (delay > 0) {
      for (let i of items) i.classList.add(className.replace(/_.*/, '') + '_ready');
      await new Promise(resolve => {
        setTimeout(() => {
          for (let i of items) i.classList.add(className);
          resolve();
        }, delay);
      });
    } else {
      for (let i of items) i.classList.add(className);
    }
  }

  /**
   * Removes className from element(s) with optional delay.
   * If delay is used, removes main class first, then "_ready".
   */
  async removeClass(selector, className, delay = 0) {
    let items = this.qsa(selector);
    if (!items || !items.length) return;
    if (delay > 0) {
      for (let i of items) i.classList.remove(className);
      await new Promise(resolve => {
        setTimeout(() => {
          for (let i of items) i.classList.remove(className.replace(/_.*/, '') + '_ready');
          resolve();
        }, delay);
      });
    } else {
      for (let i of items) i.classList.remove(className);
    }
  }

  /** Toggles className on element(s) */
  async toggleClass(selector, className, delay = 0) {
    let items = this.qsa(selector);
    if (!items || !items.length) return;
    for (let i of items) {
      if (i.classList.contains(className)) {
        await this.removeClass(i, className, delay);
      } else {
        await this.addClass(i, className, delay);
      }
    }
  }

  /** Adds or removes className based on condition */
  async switchClass(selector, condition, className, delay = 0) {
    let items = this.qsa(selector);
    if (!items || !items.length) return;
    for (let i of items) {
      if (condition) {
        await this.addClass(i, className, delay);
      } else {
        await this.removeClass(i, className, delay);
      }
    }
  }

  // ---------- Navigation and URL ----------

  /** Reloads the page */
  reload() {
    location.reload();
  }

  /** Reloads the page with updated hash */
  reloadWithHash(hash) {
    window.location.hash = hash;
    this.reload();
  }

  /** Redirects to a given URL */
  redirectTo(url) {
    window.location = url;
  }

  /** Updates URL and optionally sets document title */
  updateURL(url, title) {
    if (typeof history.pushState !== 'undefined') {
      history.pushState(null, title, url);
    } else {
      location.href = url;
    }
  }

  // ---------- Number & Formatting ----------

  /** Returns random integer between a and b (inclusive) */
  random(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  /** Formats number as price with spacing and decimal handling */
  price(price) {
    let p = parseFloat(price).toFixed(2);
    p = p.replace(/\d(?=(\d{3})+\.)/g, '$& ').replace('.00', '');
    return p;
  }

  /** Formats number with thousand separators */
  number(num) {
    num = parseFloat(num) + '';
    let [x1, x2] = num.split('.');
    x2 = x2 ? '.' + x2 : '';
    for (let b = /(\d+)(\d{3})/; b.test(x1);) {
      x1 = x1.replace(b, '$1 $2');
    }
    return x1 + x2;
  }

  /** Returns correct word form based on number */
  numberDecline(number, nominative, genitiveSingular, genitivePlural) {
    if (number > 10 && parseInt((number % 100) / 10) === 1) return genitivePlural;
    switch (number % 10) {
      case 1: return nominative;
      case 2:
      case 3:
      case 4: return genitiveSingular;
      default: return genitivePlural;
    }
  }

  // ---------- Validation ----------

  /** Checks if email is valid */
  isEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  /** Checks if string is valid JSON */
  isValidJSON(str) {
    try {
      JSON.parse(str);
      return true;
    } catch (err) {
      return false;
    }
  }

  // ---------- Utilities ----------

  /** Generates unique DOM-safe ID */
  makeId() {
    return 'id' + this.random(100000, 999999);
  }

  /**
   * Generates secure random password
   * @param {number} length - Password length
   * @param {string} selector - Optional input field selector to insert result
   */
  makePassword(length = 8, selector) {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const chars = '!@#^$%^&*()-+:,.;_';
    const digits = '0123456789';
    let password = '';

    for (let i = 0; i < Math.ceil(length / 4); ++i) {
      password += upper[Math.floor(Math.random() * upper.length)];
      password += lower[Math.floor(Math.random() * lower.length)];
      password += chars[Math.floor(Math.random() * chars.length)];
      password += digits[Math.floor(Math.random() * digits.length)];
    }

    password = password.substring(0, length)
      .split('').sort(() => 0.5 - Math.random()).join('');

    if (selector) {
      this.qs(selector).value = password;
    } else {
      return password;
    }
  }

  /**
   * Dynamically loads an external script into the document.
   */
  loadScript(path, callback, type = 'async') {
    if (!this.loadedScripts.includes(path)) {
      let script = document.createElement('script');
      script.onload = () => callback();
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
   * Defers callback execution until user interacts or timeout hits.
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

  /** Deprecated alias for deferred */
  deffered(callback, delay = 10000) {
    return this.deferred(callback, delay);
  }

  /**
   * Throttles function execution to one call per [limit] ms.
   */
  throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Watches elements and triggers callbacks when they enter or leave viewport.
   */
  onAppear(selector, appearCallback, disappearCallback = null, options = {}) {
    let elements = this.qsa(selector);
    if (!elements.length) return;

    let observer = new IntersectionObserver((entries, obs) => {
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

  // ---------- Error Handling ----------

  /** Shows alert() with all collected errors */
  alertErrors(data) {
    if (!data) return;
    if (typeof data === 'string') {
      alert(data);
    } else {
      alert(Object.values(data).join('\n'));
    }
  }

  /** Returns HTML string with errors inside <div>s */
  printErrors(data) {
    if (!data) return;
    if (typeof data === 'string') {
      return `<div>${data}</div>`;
    } else {
      return Object.entries(data)
        .map(([key, val]) => `<div class="error_${key}">${val}</div>`)
        .join('\n');
    }
  }

  // ---------- DOM Rendering ----------

  /**
   * Renders string/html into target selector.
   * Can insert or replace depending on placement.
   */
  async render(selector, data, placement = null) {
    let items = this.qsa(selector);
    if (!items || !items.length) return;
    data = typeof data === 'function' ? await data() : data;

    for (let i of items) {
      if (placement == null) {
        i.innerHTML = data;
      } else {
        i.insertAdjacentHTML(placement, data);
      }
    }
  }

  // ---------- Global Transitions ----------

  /** Enables CSS transitions globally */
  transitionsOn() {
    if (document.documentElement.classList.contains('noTransitions')) {
      setTimeout(() => {
        document.documentElement.classList.remove('noTransitions');
      }, 10);
    }
  }

  /** Disables CSS transitions globally */
  transitionsOff() {
    document.documentElement.classList.add('noTransitions');
  }
  
  // --------------- Async sleep --------------
  
  async sleep(ms) {
    return new Promise((resolve, reject) => {
      try {
        setTimeout(resolve, ms);
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const lib = new Lib();
