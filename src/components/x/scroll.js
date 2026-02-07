/**
 * @fileoverview Scroll utility for smooth scrolling to elements and active link highlighting.
 *
 * Automatically handles elements with `[x-scrollto]` attribute and provides manual scroll control.
 * Supports offset, custom parent containers, class toggling for active states, and URL hash updates.
 * Uses smooth scrolling with configurable offsets and automatic active state management.
 *
 * Exported singleton: `scroll`
 *
 * Usage:
 *
 * Basic setup:
 *   import { scroll } from './scroll.js';
 *   scroll.init();
 *
 * HTML with simple target:
 *   <a x-scrollto="#section">Go to Section</a>
 *   <div id="section">Content</div>
 *
 * HTML with options:
 *   <a x-scrollto='{"target":"#section","offset":100,"hash":true}'>Go to Section</a>
 *
 * Programmatic scrolling:
 *   await scroll.scrollTo('#section');
 *   await scroll.scrollTo({ target: '#section', offset: 50 });
 *   await scroll.scrollTo({ target: '#section', offset: 100, hash: true });
 *
 * With custom parent container:
 *   <div class="scroll-container">
 *     <a x-scrollto='{"target":"#item","parent":".scroll-container"}'>Scroll</a>
 *   </div>
 *
 * With active class:
 *   <a x-scrollto='{"target":"#section","classActive":"active"}'>Section</a>
 *   When section is in viewport center, link and target get 'active' class
 *
 * Public API:
 *
 * @method init() - Initializes all [x-scrollto] links on the page.
 *   Sets up click events and scroll observation for active class toggling.
 *   Safe to call multiple times - automatically destroys previous setup.
 *   @example
 *     scroll.init();
 *
 * @method destroy() - Removes scroll listeners and resets state.
 *   Safe to call multiple times.
 *   @example
 *     scroll.destroy();
 *
 * @method scrollTo(target | params) - Scrolls to element by id, selector, or element with options.
 *   @param {string|HTMLElement|Object} params - Target element, selector, or options object.
 *   Options format:
 *   {
 *     parent: string|HTMLElement,  // Scroll parent (default: window)
 *     target: string|HTMLElement,  // Target element or selector
 *     offset: number,               // Offset in px (default: 0)
 *     classActive: string,          // Class to toggle (default: 'active')
 *     hash: boolean                 // Whether to update URL hash (default: false)
 *   }
 *   @returns {Promise<void>} Resolves after scroll completes (~400ms).
 *   @example
 *     await scroll.scrollTo('#section');
 *     await scroll.scrollTo({ target: '#section', offset: 100, hash: true });
 *
 * Configuration:
 *
 * Default settings (can be overridden per link):
 *   - parent: window (scroll parent)
 *   - offset: 0 (pixels from top)
 *   - classActive: 'active' (class to toggle)
 *   - hash: false (update URL hash)
 *
 * Active class behavior:
 *   - Added to both link and target when target is in viewport center
 *   - Removed when target leaves viewport center
 *   - Threshold: 1/4 of viewport height from top
 *
 * SECURITY WARNINGS:
 *
 * 1. JSON parsing in x-scrollto:
 *    - JSON is validated before parsing
 *    - Only use trusted content in x-scrollto attributes
 *    - Validate selectors to prevent XSS
 *
 * 2. Selector validation:
 *    - Selectors from JSON are used in querySelector
 *    - Ensure selectors are safe (no user input directly)
 *
 * 3. URL hash manipulation:
 *    - target.id is used in URL hash
 *    - IDs are validated to prevent XSS
 *
 * Best practices:
 *
 * - Always validate selectors before use
 * - Use trusted content in x-scrollto attributes
 * - Test scroll behavior with different offsets
 * - Handle errors gracefully in scroll callbacks
 * - Consider accessibility (keyboard navigation, focus management)
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
   * Validates selector to prevent XSS attacks.
   * Only allows safe CSS selectors (basic validation).
   * @param {string} selector - Selector to validate
   * @returns {boolean} - True if appears safe
   * @private
   */
  _isValidSelector(selector) {
    if (typeof selector !== 'string' || !selector) return false;
    // Basic validation - no script tags, no javascript: protocol
    if (/<script|javascript:/i.test(selector)) return false;
    // Allow common selector patterns
    return /^[#.a-zA-Z0-9_\-\[\]="':\s>+~,()]+$/.test(selector);
  }

  /**
   * Initializes all `[x-scrollto]` links on the page.
   * Sets up click events and scroll observation for active class toggling.
   * SECURITY: Validates selectors before use.
   * Safe to call multiple times.
   */
  init() {
    if (this._initialized) {
      this.destroy();
    }

    const links = lib.qsa('[x-scrollto]');
    if (!links.length) return;

    this._linksHash = {};

    for (const link of links) {
      if (!link) continue;

      try {
        const attr = link.getAttribute('x-scrollto');
        if (!attr) {
          console.warn('scroll.init: Link has x-scrollto attribute but no value', link);
          continue;
        }

        let item = {};

        if (lib.isValidJSON(attr)) {
          const json = JSON.parse(attr);

          if (!json || typeof json !== 'object') {
            console.error('scroll.init: Invalid JSON object:', json);
            continue;
          }

          const targetSelector = json.target;
          if (!targetSelector) {
            console.error('scroll.init: Target required in JSON:', json);
            continue;
          }

          // SECURITY: Validate selector
          if (typeof targetSelector !== 'string' || !this._isValidSelector(targetSelector)) {
            console.error('scroll.init: Invalid or unsafe selector:', targetSelector);
            continue;
          }

          const target = lib.qs(targetSelector);
          if (!target) {
            console.error('scroll.init: Target element not found:', targetSelector);
            continue;
          }

          item.link = link;
          item.target = target;
          item.offset = typeof json.offset === 'number' ? json.offset : this.offset;
          item.classActive = json.classActive || this.classActive;
          item.hash = json.hash ?? this.hash;

          // Validate parent selector if provided
          if (json.parent) {
            if (typeof json.parent === 'string') {
              if (!this._isValidSelector(json.parent)) {
                console.error('scroll.init: Invalid parent selector:', json.parent);
                item.parent = this.parent;
              } else {
                const parentEl = lib.qs(json.parent);
                item.parent = parentEl || this.parent;
              }
            } else if (json.parent instanceof HTMLElement || json.parent === window) {
              item.parent = json.parent;
            } else {
              item.parent = this.parent;
            }
          } else {
            item.parent = this.parent;
          }
        } else {
          // Simple string selector
          if (!this._isValidSelector(attr)) {
            console.error('scroll.init: Invalid or unsafe selector:', attr);
            continue;
          }

          const target = lib.qs(attr);
          if (!target) {
            console.error('scroll.init: Target not found:', attr);
            continue;
          }

          item.link = link;
          item.parent = this.parent;
          item.target = target;
          item.offset = this.offset;
          item.classActive = this.classActive;
          item.hash = this.hash;
        }

        if (item.link && item.target) {
          const id = lib.makeId();
          if (!id) {
            console.error('scroll.init: Failed to generate ID');
            continue;
          }

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
        console.error('scroll.init: Error processing link', link, err);
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
   * Validates element ID to prevent XSS in URL hash.
   * @param {string} id - ID to validate
   * @returns {boolean} - True if valid
   * @private
   */
  _isValidId(id) {
    if (typeof id !== 'string' || !id) return false;
    return /^[a-zA-Z0-9_-]+$/.test(id);
  }

  /**
   * Scrolls to a specific element or target.
   * SECURITY: Validates selectors and IDs before use.
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
      if (!params) {
        console.error('scroll.scrollTo: Parameters required');
        resolve();
        return;
      }

      let target;
      let parent;
      let offset;
      let hash;

      // Determine target
      if (params instanceof HTMLElement) {
        target = params;
        parent = this.parent;
        offset = this.offset;
        hash = this.hash;
      } else if (typeof params === 'string') {
        // SECURITY: Validate selector
        if (!this._isValidSelector(params)) {
          console.error('scroll.scrollTo: Invalid or unsafe selector:', params);
          resolve();
          return;
        }
        target = lib.qs(params);
        parent = this.parent;
        offset = this.offset;
        hash = this.hash;
      } else if (typeof params === 'object') {
        // Options object
        if (params.target instanceof HTMLElement) {
          target = params.target;
        } else if (typeof params.target === 'string') {
          // SECURITY: Validate selector
          if (!this._isValidSelector(params.target)) {
            console.error('scroll.scrollTo: Invalid or unsafe target selector:', params.target);
            resolve();
            return;
          }
          target = lib.qs(params.target);
        } else {
          console.error('scroll.scrollTo: Invalid target parameter:', params.target);
          resolve();
          return;
        }

        // Determine parent
        if (params.parent === window || params.parent instanceof HTMLElement) {
          parent = params.parent;
        } else if (typeof params.parent === 'string') {
          // SECURITY: Validate selector
          if (!this._isValidSelector(params.parent)) {
            console.error('scroll.scrollTo: Invalid or unsafe parent selector:', params.parent);
            parent = this.parent;
          } else {
            parent = lib.qs(params.parent) || this.parent;
          }
        } else {
          parent = this.parent;
        }

        offset = typeof params.offset === 'number' ? params.offset : this.offset;
        hash = params.hash ?? this.hash;
      } else {
        console.error('scroll.scrollTo: Invalid parameters:', params);
        resolve();
        return;
      }

      if (!target) {
        console.error('scroll.scrollTo: Target not found:', params);
        resolve();
        return;
      }

      if (!parent) {
        console.error('scroll.scrollTo: Parent not found');
        resolve();
        return;
      }

      let elementY, startingY, parentY, diff;

      try {
        if (parent === window) {
          startingY = window.pageYOffset || window.scrollY;
          elementY = startingY + target.getBoundingClientRect().top;
          diff = elementY - startingY - offset;
        } else {
          startingY = parent.scrollTop;
          parentY = parent.getBoundingClientRect().top;
          elementY = startingY + target.getBoundingClientRect().top - parentY;
          diff = elementY - startingY - offset;
        }

        parent.scrollTo({
          top: Math.max(0, startingY + diff),
          left: 0,
          behavior: 'smooth'
        });

        setTimeout(resolve, 400);

        // SECURITY: Validate ID before using in URL
        if (hash && target.id) {
          if (this._isValidId(target.id)) {
            lib.updateURL('#' + target.id);
          } else {
            console.warn('scroll.scrollTo: Invalid target ID for hash:', target.id);
          }
        } else if (hash) {
          history.replaceState({}, document.title, window.location.href.split('#')[0]);
        }
      } catch (err) {
        console.error('scroll.scrollTo: Error during scroll', err);
        resolve();
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
    const threshold = document.documentElement.clientHeight / 4;

    for (const key in this._linksHash) {
      if (!this._linksHash.hasOwnProperty(key)) continue;

      const item = this._linksHash[key];
      if (!item || !item.target || !item.link) continue;

      try {
        const rect = item.target.getBoundingClientRect();
        const isActive = rect.top <= threshold && rect.bottom > threshold;

        if (item.classActive != null) {
          if (isActive) {
            if (!item.link.classList.contains(item.classActive)) {
              item.link.classList.add(item.classActive);
            }
            if (!item.target.classList.contains(item.classActive)) {
              item.target.classList.add(item.classActive);
            }
          } else {
            if (item.link.classList.contains(item.classActive)) {
              item.link.classList.remove(item.classActive);
            }
            if (item.target.classList.contains(item.classActive)) {
              item.target.classList.remove(item.classActive);
            }
          }
        }
      } catch (err) {
        console.error('scroll._scrollObserve: Error observing item', key, err);
      }
    }
  }
}

/**
 * Singleton export of Scroll.
 * Use `scroll.init()` to initialize or reinitialize safely.
 *
 * @type {Scroll}
 */
export const scroll = new Scroll();
