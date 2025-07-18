/**
 * @fileoverview Scroll-based animation controller.
 *
 * Observes elements with `[x-animate]` attribute and applies classes or executes functions
 * based on the element's position in the viewport or parent container.
 *
 * Exported singleton: `animate`
 *
 * Public API:
 *
 * - `animate.init()` – Initialize/reinitialize animation tracking for `[x-animate]` elements.
 *
 * Example usage:
 *
 * <div x-animate='{
 *   "parent": "#scroll-container",
 *   "trigger": ".trigger",
 *   "start": "120vh",
 *   "end": "0vh",
 *   "functionName": "coverOut",
 *   "class": "fixed",
 *   "classRemove": true
 * }'></div>
 *
 * @author Andrey Shpigunov
 * @version 0.3
 * @since 2025-07-18
 */

import { lib } from './lib';

/**
 * Scroll-based animation controller.
 */
class Animate {

  constructor() {
    /**
     * Prevents multiple `requestAnimationFrame` calls.
     * @type {boolean}
     * @private
     */
    this._ticking = false;

    /**
     * Array of animation items parsed from `[x-animate]` elements.
     * @type {Object[]}
     * @private
     */
    this._animations = [];

    /**
     * Bound scroll handler for `requestAnimationFrame`.
     * @type {Function}
     * @private
     */
    this._scroll = this._scroll.bind(this);

    /**
     * Bound raw scroll/resize handler.
     * @type {Function}
     * @private
     */
    this._scrollHandler = this._scrollHandler.bind(this);

    /**
     * Indicates whether `init()` was called.
     * @type {boolean}
     * @private
     */
    this._initialized = false;

    /**
     * Set of parent elements being listened to for scroll.
     * @type {Set<HTMLElement|Window>}
     * @private
     */
    this._parents = new Set();

    /**
     * NodeList of elements with `[x-animate]`.
     * @type {NodeListOf<HTMLElement>|null}
     * @private
     */
    this._elements = null;
  }

  /**
   * Initializes or reinitializes animation tracking for `[x-animate]` elements.
   */
  init() {
    this._cleanup();

    this._elements = lib.qsa('[x-animate]');
    if (!this._elements?.length) return;

    this._parseElementsAnimations();
    if (!this._animations.length) return;

    this._setupListeners();
    this._initialized = true;
  }

  /**
   * Removes all listeners and resets internal state.
   *
   * @private
   */
  _cleanup() {
    if (!this._initialized) return;

    this._parents.forEach(parent => {
      parent.removeEventListener('scroll', this._scrollHandler);
    });

    window.removeEventListener('resize', this._scrollHandler);

    this._ticking = false;
    this._animations = [];
    this._parents = new Set();
    this._elements = null;
    this._initialized = false;
  }

  /**
   * Parses `[x-animate]` attributes and creates animation configuration for each element.
   *
   * @private
   */
  _parseElementsAnimations() {
    this._elements.forEach(element => {
      try {
        const json = JSON.parse(element.getAttribute('x-animate'));
        const item = {
          element,
          trigger: lib.qs(json.trigger) || element,
          parent: lib.qs(json.parent) || window,
          start: json.start,
          end: json.end || false,
          class: json.class,
          classRemove: json.classRemove !== false,
          functionName: json.functionName,
          lockedIn: false,
          lockedOut: false,
          log: json.log || false
        };
        this._animations.push(item);
      } catch (err) {
        console.error('Invalid JSON in x-animate attribute:', element, err);
      }
    });
  }

  /**
   * Sets up scroll and resize event listeners for unique parent containers.
   *
   * @private
   */
  _setupListeners() {
    for (const item of this._animations) {
      if (this._parents.has(item.parent)) continue;
      this._parents.add(item.parent);
      item.parent.addEventListener('scroll', this._scrollHandler);
    }

    window.addEventListener('resize', this._scrollHandler);

    if (document.readyState === 'complete') {
      requestAnimationFrame(() => this._scroll());
    } else {
      window.addEventListener('load', () => this._scroll(), { once: true });
    }
  }

  /**
   * Raw scroll/resize event handler with throttling via `requestAnimationFrame`.
   *
   * @private
   */
  _scrollHandler() {
    if (!this._ticking) {
      this._ticking = true;
      window.requestAnimationFrame(() => {
        this._scroll();
        this._ticking = false;
      });
    }
  }

  /**
   * Main animation logic executed on scroll or resize.
   *
   * Calculates element position, progress, adds/removes classes, and calls custom functions.
   *
   * @private
   */
  _scroll() {
    this._animations.forEach(item => {
      const triggerRect = item.trigger.getBoundingClientRect();
      const parentRect = item.parent !== window ? item.parent.getBoundingClientRect() : null;

      const top = triggerRect.top - (parentRect ? parentRect.top : 0);
      const start = this._2px(item.start, item.parent);
      const end = this._2px(item.end, item.parent);
      item.duration = isNaN(end) ? 0 : start - end;

      if (item.log) console.log(top, start, end, item);

      if (!isNaN(start) && !isNaN(end)) {
        // Case: both start and end defined
        if (top <= start && top >= end) {
          item.lockedOut = false;
          if (item.class) item.element.classList.add(item.class);

          if (typeof window[item.functionName] === 'function') {
            item.progress = ((start - top) / item.duration).toFixed(4);
            window[item.functionName](item);
          }

        } else {
          if (item.class && item.classRemove === true && item.element.classList.contains(item.class)) {
            item.element.classList.remove(item.class);
          }

          if (!item.lockedOut && typeof window[item.functionName] === 'function') {
            if (top >= start) {
              item.progress = 0;
              window[item.functionName](item);
              item.lockedOut = true;
            }
            if (top <= end) {
              item.progress = 1;
              window[item.functionName](item);
              item.lockedOut = true;
            }
          }
        }

      } else if (!isNaN(start)) {
        // Case: only start defined
        if (top <= start) {
          item.lockedOut = false;
          if (item.class) item.element.classList.add(item.class);

          if (!item.lockedIn && typeof window[item.functionName] === 'function') {
            item.progress = 1;
            window[item.functionName](item);
            item.lockedIn = true;
          }

        } else {
          item.lockedIn = false;

          if (item.class && item.classRemove === true && item.element.classList.contains(item.class)) {
            item.element.classList.remove(item.class);
          }

          if (!item.lockedOut && typeof window[item.functionName] === 'function') {
            if (top >= start) {
              item.progress = 0;
              window[item.functionName](item);
              item.lockedOut = true;
            }
          }
        }
      }
    });
  }

  /**
   * Converts a value like '120vh', '50%' or '300' into pixels.
   *
   * @param {string|number} value - The value to convert.
   * @param {HTMLElement|Window} [parent=window] - The context for percentage calculations.
   * @returns {number} Pixel value.
   * @private
   */
  _2px(value, parent = window) {
    if (/(%|vh)/.test(value)) {
      const height = parent === window
        ? document.documentElement.clientHeight
        : parent.clientHeight;

      value = value.replace(/(vh|%)/, '');
      return (height * parseFloat(value)) / 100;
    } else {
      return parseFloat(value);
    }
  }
}

/**
 * Singleton export of the Animate controller.
 * @type {Animate}
 */
export const animate = new Animate();
