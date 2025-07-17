/**
 * @fileoverview Infinite scroll system for dynamic content loading.
 *
 * Observes elements with `[x-loadmore]` attribute and automatically calls
 * a specified function when the element becomes visible near the bottom of the viewport.
 * Useful for implementing "Load More" or endless scroll functionality.
 *
 * Public API:
 *
 * - `loadmore.init()` – Initializes observation of `[x-loadmore]` elements.
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
 * Behavior:
 * - Calls the specified function when the element is near viewport bottom.
 * - Passes `page` parameter to the function.
 * - If the function returns `true`, continues observing for more pages.
 * - If it returns `false`, stops observing that element.
 *
 * @author Andrey Shpigunov
 * @version 0.2
 * @since 2025-07-17
 */

import { lib } from './lib';

/**
 * Infinite scroll controller.
 * Tracks elements with `[x-loadmore]` and calls callbacks when they appear.
 */
class Loadmore {
  /**
   * Creates the Loadmore instance.
   */
  constructor() {
    /**
     * Stores tracked elements and their pagination state.
     * @type {Object.<string, {el: HTMLElement, page: number}>}
     */
    this.items = {};

    /**
     * Lock flag to prevent concurrent triggers.
     * @type {boolean}
     * @private
     */
    this.locked = false;
  }

  /**
   * Initializes the loadmore system.
   * Sets up IntersectionObserver to watch `[x-loadmore]` elements.
   *
   * Automatically calls the specified function from `x-loadmore` attribute when the element appears.
   */
  init() {
    const blocks = lib.qsa('[x-loadmore]');
    if (!blocks.length) return;

    /**
     * IntersectionObserver callback.
     *
     * @param {IntersectionObserverEntry[]} entries
     * @param {IntersectionObserver} observer
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
                    // Stop observing if no more content
                    observer.unobserve(el);
                  }
                } catch (error) {
                  console.error('Error executing loadmore callback:', error);
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
     * Triggers when element is 400px from viewport bottom.
     * @type {IntersectionObserverInit}
     */
    const options = {
      rootMargin: '0px 0px 400px 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver(callback, options);

    // Observe each block
    blocks.forEach(block => {
      const id = lib.makeId();
      block.setAttribute('id', id);

      this.items[id] = {
        el: block,
        page: 1
      };

      observer.observe(block);
    });
  }
}

/**
 * Singleton export of Loadmore.
 * @type {Loadmore}
 */
export const loadmore = new Loadmore();
