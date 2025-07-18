/**
 * @fileoverview Infinite scroll system for dynamic content loading.
 *
 * Observes elements with `[x-loadmore]` attribute and automatically calls
 * a specified function when the element becomes visible near the bottom of the viewport.
 *
 * Usage example:
 *
 * HTML:
 * <div x-loadmore='{"functionName": "load"}'></div>
 *
 * JS:
 * function load(page) {
 *   console.log('Load page:', page);
 *   return true; // Continue loading
 * }
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
    if (this._initialized) {
      this.destroy();
    }

    const blocks = lib.qsa('[x-loadmore]');
    if (!blocks.length) return;

    /**
     * IntersectionObserver callback.
     * @param {IntersectionObserverEntry[]} entries
     * @param {IntersectionObserver} observer
     * @private
     */
    const callback = async (entries, observer) => {
      for (let entry of entries) {
        if (entry.isIntersecting && !this.locked) {
          this.locked = true;

          const el = entry.target;
          const loadmoreAttr = el.getAttribute('x-loadmore');

          if (lib.isValidJSON(loadmoreAttr)) {
            const json = JSON.parse(loadmoreAttr);

            if (json.functionName) {
              const fn = window[json.functionName];
              if (typeof fn === 'function') {
                try {
                  const id = el.id;
                  const page = this.items[id].page;

                  // Call the callback function with current page
                  const hasMore = await fn(page);

                  if (hasMore) {
                    this.items[id].page++;
                  } else {
                    observer.unobserve(el);
                  }
                } catch (e) {
                  console.error('Loadmore callback error:', e);
                }
              } else {
                console.error(`Function "${json.functionName}" is not defined.`);
              }
            } else {
              console.warn('Missing "functionName" in x-loadmore attribute:', json);
            }
          } else {
            console.error('Invalid JSON in x-loadmore attribute:', loadmoreAttr);
          }

          this.locked = false;
        }
      }
    };

    /**
     * IntersectionObserver options.
     * Triggers when element is within 400px from viewport bottom.
     * @type {IntersectionObserverInit}
     */
    const options = {
      rootMargin: '0px 0px 400px 0px',
      threshold: 0
    };

    this.observer = new IntersectionObserver(callback, options);

    // Observe each block
    blocks.forEach(block => {
      const id = lib.makeId();
      block.setAttribute('id', id);
      this.items[id] = { el: block, page: 1 };

      this.observer.observe(block);
    });

    this._initialized = true;
  }

  /**
   * Destroys the loadmore system.
   * Stops observing all elements and resets the internal state.
   * Safe to call multiple times.
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.items = {};
    this.locked = false;
    this._initialized = false;
  }
}

/**
 * Singleton export of Loadmore system.
 * Use `loadmore.init()` to initialize or reinitialize.
 *
 * @type {Loadmore}
 */
export const loadmore = new Loadmore();
