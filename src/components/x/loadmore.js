/**
 * @fileoverview Infinite scroll system for dynamic content loading.
 *
 * Observes elements with `[x-loadmore]` attribute and automatically calls
 * a specified function when the element becomes visible near the bottom of the viewport.
 * Uses IntersectionObserver API for efficient viewport detection.
 *
 * Exported singleton: `loadmore`
 *
 * Usage:
 *
 * Basic setup:
 *   import { loadmore } from './loadmore.js';
 *   loadmore.init();
 *
 * HTML structure:
 *   <div x-loadmore='{"functionName": "loadMoreData"}'></div>
 *
 * JavaScript callback:
 *   async function loadMoreData(page) {
 *     const response = await fetch(`/api/data?page=${page}`);
 *     const data = await response.json();
 *
 *     // Append data to container
 *     document.querySelector('.container').innerHTML += data.html;
 *
 *     // Return true to continue loading, false to stop
 *     return data.hasMore;
 *   }
 *
 * Complete example:
 *   HTML:
 *     <div class="items-container">
 *       <div class="item">Item 1</div>
 *       <div class="item">Item 2</div>
 *     </div>
 *     <div x-loadmore='{"functionName": "loadItems"}'></div>
 *
 *   JavaScript:
 *     let currentPage = 1;
 *     async function loadItems(page) {
 *       try {
 *         const response = await fetch(`/api/items?page=${page}`);
 *         const items = await response.json();
 *
 *         const container = document.querySelector('.items-container');
 *         items.forEach(item => {
 *           const div = document.createElement('div');
 *           div.className = 'item';
 *           div.textContent = item.name;
 *           container.appendChild(div);
 *         });
 *
 *         return items.length > 0; // Continue if items were loaded
 *       } catch (error) {
 *         console.error('Failed to load items:', error);
 *         return false; // Stop on error
 *       }
 *     }
 *
 *     loadmore.init();
 *
 * Public API:
 *
 * @method init() - Initializes the loadmore system.
 *   Observes all elements with [x-loadmore] attribute.
 *   Safe to call multiple times - automatically destroys previous observer.
 *   @example
 *     loadmore.init();
 *
 * @method destroy() - Destroys the loadmore system.
 *   Stops observing all elements and resets internal state.
 *   Safe to call multiple times.
 *   @example
 *     loadmore.destroy();
 *
 * Configuration:
 *
 * The `x-loadmore` attribute must contain valid JSON:
 *   {
 *     "functionName": "yourFunctionName"
 *   }
 *
 * Callback function signature:
 *   async function yourFunctionName(page) {
 *     // page: number - Current page number (starts from 1)
 *     // Return: boolean - true to continue, false to stop
 *     return true;
 *   }
 *
 * Behavior:
 *
 * - Automatically assigns unique ID to each [x-loadmore] element
 * - Tracks page number per element (starts from 1)
 * - Triggers when element is within 400px from viewport bottom
 * - Uses lock mechanism to prevent concurrent triggers
 * - Automatically stops observing when callback returns false
 *
 * Observer options:
 *
 * - rootMargin: '0px 0px 400px 0px' - Triggers 400px before element enters viewport
 * - threshold: 0 - Triggers as soon as any part is visible
 *
 * SECURITY WARNINGS:
 *
 * 1. Function name validation:
 *    - Only use trusted function names in x-loadmore attribute
 *    - Function names are validated against allowed patterns
 *    - Avoid using user input directly in functionName
 *
 * 2. JSON parsing:
 *    - JSON is validated before parsing
 *    - Invalid JSON will be logged and ignored
 *
 * Best practices:
 *
 * - Always validate data from API responses
 * - Use async/await for asynchronous operations
 * - Return false from callback to stop loading on errors
 * - Handle errors gracefully in callback functions
 * - Consider rate limiting for API calls
 *
 * Next.js: call init() in useEffect; call destroy() in cleanup (e.g. on unmount).
 * SSR-safe: init/destroy no-op when window/document is undefined.
 *
 * @example
 * useEffect(() => {
 *   loadmore.init();
 *   return () => loadmore.destroy();
 * }, []);
 *
 * @author Andrey Shpigunov
 * @version 0.3
 * @since 2025-07-18
 */

import { lib } from './lib';

/**
 * Infinite scroll controller.
 * Automatically observes `[x-loadmore]` elements and calls specified callbacks.
 */
class Loadmore {
  /**
   * Creates the Loadmore instance.
   */
  constructor() {
    /**
     * Stores tracked elements and their pagination state.
     * Key is the element ID.
     * @type {Object.<string, {el: HTMLElement, page: number}>}
     */
    this.items = {};

    /**
     * Lock flag to prevent concurrent triggers.
     * @type {boolean}
     * @private
     */
    this.locked = false;

    /**
     * IntersectionObserver instance.
     * @type {IntersectionObserver|null}
     * @private
     */
    this.observer = null;

    /**
     * Initialization flag to control safe reinitialization.
     * @type {boolean}
     * @private
     */
    this._initialized = false;
  }

  /**
   * Initializes the loadmore system.
   * Automatically observes all elements with `[x-loadmore]` on the page.
   *
   * - If called multiple times, safely reinitializes by destroying previous observer.
   * - On each intersection, calls the specified `functionName` from `x-loadmore` JSON attribute.
   *
   * The callback receives the current `page` number.
   * If it returns `true`, the observer will continue watching.
   * If it returns `false`, the element will be unobserved.
   *
   * Example of `x-loadmore` attribute:
   * ```html
   * <div x-loadmore='{"functionName": "loadMoreData"}'></div>
   * ```
   *
   * Example of callback:
   * ```js
   * function loadMoreData(page) {
   *   console.log('Load page:', page);
   *   return true; // Continue loading
   * }
   * ```
   */
  init() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (this._initialized) this.destroy();

    const blocks = lib.qsa('[x-loadmore]');
    const len = blocks.length;
    if (!len) return;

    const FN_NAME_REG = /^[a-zA-Z_$][a-zA-Z0-9_$.]*$/;

    const callback = async (entries, observer) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry.isIntersecting || this.locked) continue;

        this.locked = true;
        try {
          const el = entry.target;
          if (!el) continue;

          const loadmoreAttr = el.getAttribute('x-loadmore');
          if (!loadmoreAttr) continue;

          let json;
          try {
            json = JSON.parse(loadmoreAttr);
          } catch (_) {
            continue;
          }
          const functionName = json && json.functionName;
          if (typeof functionName !== 'string' || !FN_NAME_REG.test(functionName)) continue;

          const fn = window[functionName];
          if (typeof fn !== 'function') continue;

          const id = el.id;
          const item = id ? this.items[id] : null;
          if (!item) continue;

          const page = item.page || 1;
          const hasMore = await fn(page);

          if (hasMore === true) {
            item.page = page + 1;
          } else if (hasMore === false) {
            observer.unobserve(el);
          }
        } catch (_) {
        } finally {
          this.locked = false;
        }
      }
    };

    if (!('IntersectionObserver' in window)) return;

    this.observer = new IntersectionObserver(callback, {
      rootMargin: '0px 0px 400px 0px',
      threshold: 0
    });

    for (let i = 0; i < len; i++) {
      const block = blocks[i];
      const id = lib.makeId();
      if (!id) continue;
      block.setAttribute('id', id);
      this.items[id] = { el: block, page: 1 };
      this.observer.observe(block);
    }

    this._initialized = true;
  }

  /**
   * Destroys the loadmore system. SSR-safe: no-op when window undefined.
   * Safe to call multiple times.
   */
  destroy() {
    if (typeof window === 'undefined') return;
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.items = {};
    this.locked = false;
    this._initialized = false;
  }

  /**
   * Resets page counter for an element. SSR-safe: no-op when document undefined.
   * @param {string} selector - CSS selector for the element
   */
  reset(selector) {
    if (typeof document === 'undefined') return;
    const el = lib.qs(selector);
    if (!el || !el.id) return;
    const item = this.items[el.id];
    if (item) item.page = 1;
  }
}

/**
 * Singleton export of Loadmore system.
 * Use `loadmore.init()` to initialize or reinitialize.
 *
 * @type {Loadmore}
 */
export const loadmore = new Loadmore();
