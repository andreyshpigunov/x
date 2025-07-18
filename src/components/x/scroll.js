/**
 * @fileoverview Scroll utility for smooth scrolling to elements and active link highlighting.
 *
 * Automatically handles elements with `[x-scrollto]` attribute and provides manual scroll control.
 * Supports offset, custom parent containers, class toggling for active states, and URL hash updates.
 *
 * Public API:
 *
 * - `scroll.init()` – Initializes `[x-scrollto]` links and sets up observers. Safe for multiple calls.
 * - `scroll.destroy()` – Removes scroll observers and event listeners.
 * - `scroll.scrollTo(target | params)` – Scrolls to element by id, selector, or element with options.
 *
 * Example usage:
 *
 * HTML:
 * <a x-scrollto="top">Up</a>
 * <a x-scrollto='{"target":"#section","offset":100}'>Go to section</a>
 *
 * JS:
 * scroll.scrollTo('#section');
 * scroll.scrollTo({ target: '#section', offset: 50 });
 *
 * Async:
 * await scroll.scrollTo('#section');
 *
 * @author Andrey Shpigunov
 * @version 0.3
 * @since 2025-07-18
 */

import { lib } from './lib';

/**
 * Scroll utility class.
 * Handles smooth scrolling to targets and active class management.
 */
class Scroll {
  /**
   * Creates a Scroll instance.
   */
  constructor() {
    /**
     * Default scroll parent. Can be window or a DOM element.
     * @type {Window|HTMLElement}
     */
    this.parent = window;

    /**
     * Default offset in pixels.
     * @type {number}
     */
    this.offset = 0;

    /**
     * Default active class name.
     * @type {string}
     */
    this.classActive = 'active';

    /**
     * Whether to update URL hash after scroll.
     * @type {boolean}
     */
    this.hash = false;

    /**
     * Shortcut to scrollTo method.
     * @type {Function}
     */
    this.to = this.scrollTo;

    /**
     * Internal registry of observed links and targets.
     * @type {Object.<string, Object>}
     * @private
     */
    this._linksHash = {};

    /**
     * Scroll event handlers for cleanup.
     * @type {Map<HTMLElement|Window, Function>}
     * @private
     */
    this._scrollHandlers = new Map();

    /**
     * Initialization flag to prevent duplicate setup.
     * @type {boolean}
     * @private
     */
    this._initialized = false;
  }

  /**
   * Initializes all `[x-scrollto]` links on the page.
   * Sets up click events and scroll observation for active class toggling.
   * Safe to call multiple times.
   */
  init() {
    if (this._initialized) {
      this.destroy();
    }

    const links = lib.qsa('[x-scrollto]');
    if (!links.length) return;

    this._linksHash = {};

    for (let link of links) {
      try {
        let item = {};
        let attr = link.getAttribute('x-scrollto');

        if (lib.isValidJSON(attr)) {
          let json = JSON.parse(attr);

          if (json.hasOwnProperty('target') && lib.qs(json.target)) {
            item.link = link;
            item.parent = json.parent || this.parent;
            item.target = lib.qs(json.target);
            item.offset = json.offset || this.offset;
            item.classActive = json.classActive || this.classActive;
            item.hash = json.hash ?? this.hash; // allow false override
          } else {
            console.error('Target required in JSON or element does not exist:', json);
            continue;
          }
        } else {
          if (lib.qs(attr)) {
            item.link = link;
            item.parent = this.parent;
            item.target = lib.qs(attr);
            item.offset = this.offset;
            item.classActive = this.classActive;
            item.hash = this.hash;
          } else {
            console.error(`Target "${attr}" not found.`);
            continue;
          }
        }

        if (item) {
          const id = lib.makeId();
          this._linksHash[id] = item;
          
          link.addEventListener('click', event => {
            event.preventDefault();
            this.scrollTo({
              parent: item.parent,
              target: item.target,
              offset: item.offset,
              classActive: item.classActive,
              hash: item.hash
            });
          });
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (Object.keys(this._linksHash).length) {
      this._setupScrollObservers();
    }

    this._initialized = true;
  }

  /**
   * Removes scroll listeners and resets the state.
   * Safe to call multiple times.
   */
  destroy() {
    for (const [parent, handler] of this._scrollHandlers.entries()) {
      parent.removeEventListener('scroll', handler);
    }

    this._scrollHandlers.clear();
    this._linksHash = {};
    this._initialized = false;
  }

  /**
   * Scrolls to a specific element or target.
   *
   * @param {string|HTMLElement|Object} params - Target element, selector, or options object.
   * Options format:
   * {
   *   parent: string|HTMLElement,  // Scroll parent (default: window)
   *   target: string|HTMLElement,  // Target element or selector
   *   offset: number,               // Offset in px
   *   classActive: string,          // Class to toggle
   *   hash: boolean                 // Whether to update URL hash
   * }
   * @returns {Promise<void>} Resolves after scroll completes.
   */
  async scrollTo(params) {
    return new Promise(resolve => {
      const parent = typeof params.parent === 'string' ? lib.qs(params.parent) : params.parent || this.parent;
      const offset = params.offset || this.offset;
      const hash = params.hash ?? this.hash;

      const target = typeof params === 'object' && !(params instanceof Element)
        ? lib.qs(params.target)
        : lib.qs(params);

      if (!target) {
        console.error('Target not found:', params.target || params);
        resolve();
        return;
      }

      let elementY, startingY, parentY, diff;

      if (parent === window) {
        startingY = window.pageYOffset;
        elementY = startingY + target.getBoundingClientRect().top;
        diff = elementY - startingY - offset;
      } else {
        startingY = parent.scrollTop;
        parentY = parent.getBoundingClientRect().top;
        elementY = startingY + target.getBoundingClientRect().top - parentY;
        diff = elementY - startingY - offset;
      }

      parent.scrollTo({
        top: startingY + diff,
        left: 0,
        behavior: 'smooth'
      });

      setTimeout(resolve, 400);

      if (hash && target.id) {
        lib.updateURL('#' + target.id);
      } else if (hash) {
        history.replaceState({}, document.title, window.location.href.split('#')[0]);
      }
    });
  }

  /**
   * Sets up scroll event listeners for all unique parents to manage active classes.
   * @private
   */
  _setupScrollObservers() {
    const parents = new Set();

    for (const key in this._linksHash) {
      parents.add(this._linksHash[key].parent);
    }

    for (const parent of parents) {
      const el = parent === window ? window : lib.qs(parent);
      if (!el) continue;

      const handler = () => {
        this._scrollObserve();
      };

      el.addEventListener('scroll', handler, { passive: true });
      this._scrollHandlers.set(el, handler);
    }

    // Initial trigger
    this._scrollObserve();
  }

  /**
   * Observes scroll position to manage active classes on links and targets.
   * Adds or removes `classActive` when target enters viewport center.
   * @private
   */
  _scrollObserve() {
    Object.keys(this._linksHash).forEach(i => {
      const item = this._linksHash[i];
      const rect = item.target.getBoundingClientRect();
      const threshold = document.documentElement.clientHeight / 4;

      if (rect.top <= threshold && rect.bottom > threshold) {
        if (item.classActive != null) {
          item.link.classList.add(item.classActive);
          item.target.classList.add(item.classActive);
        }
      } else {
        if (item.classActive != null) {
          item.link.classList.remove(item.classActive);
          item.target.classList.remove(item.classActive);
        }
      }
    });
  }
}

/**
 * Singleton export of Scroll.
 * Use `scroll.init()` to initialize or reinitialize safely.
 *
 * @type {Scroll}
 */
export const scroll = new Scroll();
