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
 * Next.js: call init() in useEffect(); on route change call destroy() in cleanup and init() after mount.
 * SSR-safe: init/destroy no-op when window is undefined.
 *
 * @example
 * // Next.js — _app.tsx or layout
 * import { useEffect } from 'react';
 * import { usePathname } from 'next/navigation';
 * import { animate } from '@andreyshpigunov/x/animate';
 *
 * export default function App({ Component, pageProps }) {
 *   const pathname = usePathname();
 *
 *   useEffect(() => {
 *     animate.init();
 *     return () => animate.destroy();
 *   }, [pathname]);
 *
 *   return <Component {...pageProps} />;
 * }
 *
 * @author Andrey Shpigunov
 * @version 0.4
 * @since 2026-02-02
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
    if (typeof window === 'undefined') return;

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
    if (typeof window === 'undefined') return;

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
   * Stops observing and resets state. Use when unmounting (e.g. Next.js route change).
   */
  destroy() {
    if (typeof window === 'undefined') return;
    this._cleanup();
  }

  /**
   * Parses `[x-animate]` attributes and creates animation configuration for each element.
   *
   * @private
   */
  _parseElementsAnimations() {
    this._animations = [];
    for (const element of this._elements) {
      try {
        const json = JSON.parse(element.getAttribute('x-animate'));
        this._animations.push({
          element,
          trigger: lib.qs(json.trigger) || element,
          parent: lib.qs(json.parent) || window,
          start: json.start,
          end: json.end || false,
          class: json.class,
          classRemove: json.classRemove !== false,
          functionName: json.functionName,
          fn: null,
          lockedIn: false,
          lockedOut: false,
          log: json.log || false
        });
      } catch (err) {
        console.error('Invalid JSON in x-animate attribute:', element, err);
      }
    }
  }

  /**
   * Sets up scroll and resize event listeners for unique parent containers.
   *
   * @private
   */
  _setupListeners() {
    for (const item of this._animations) {
      if (!this._parents.has(item.parent)) {
        this._parents.add(item.parent);
        item.parent.addEventListener('scroll', this._scrollHandler);
      }
    }
    window.addEventListener('resize', this._scrollHandler);

    const runScroll = () => requestAnimationFrame(() => this._scroll());
    if (document.readyState === 'complete') {
      runScroll();
    } else {
      window.addEventListener('load', runScroll, { once: true });
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
    for (let i = 0; i < this._animations.length; i++) {
      const item = this._animations[i];
      if (!item.element.isConnected || !item.trigger.isConnected) continue;
      if (!item.fn && item.functionName && typeof window[item.functionName] === 'function') {
        item.fn = window[item.functionName];
      }
      const triggerRect = item.trigger.getBoundingClientRect();
      const parent = item.parent;
      const parentTop = parent === window ? 0 : parent.getBoundingClientRect().top;
      const top = triggerRect.top - parentTop;
      const start = this._2px(item.start, parent);
      const end = this._2px(item.end, parent);
      const hasStart = !isNaN(start);
      const hasEnd = !isNaN(end);
      const fn = item.fn;

      if (item.log) console.log(top, start, end, item);

      if (hasStart && hasEnd) {
        item.duration = start - end;
        const inRange = top <= start && top >= end;
        if (inRange) {
          item.lockedOut = false;
          if (item.class && !item.element.classList.contains(item.class)) item.element.classList.add(item.class);
          if (fn) {
            item.progress = ((start - top) / item.duration).toFixed(4);
            fn(item);
          }
        } else {
          if (item.class && item.classRemove && item.element.classList.contains(item.class)) item.element.classList.remove(item.class);
          if (!item.lockedOut && fn) {
            if (top >= start) {
              item.progress = 0;
              fn(item);
              item.lockedOut = true;
            } else if (top <= end) {
              item.progress = 1;
              fn(item);
              item.lockedOut = true;
            }
          }
        }
      } else if (hasStart) {
        const pastStart = top <= start;
        if (pastStart) {
          item.lockedOut = false;
          if (item.class && !item.element.classList.contains(item.class)) item.element.classList.add(item.class);
          if (!item.lockedIn && fn) {
            item.progress = 1;
            fn(item);
            item.lockedIn = true;
          }
        } else {
          item.lockedIn = false;
          if (item.class && item.classRemove && item.element.classList.contains(item.class)) item.element.classList.remove(item.class);
          if (!item.lockedOut && fn && top >= start) {
            item.progress = 0;
            fn(item);
            item.lockedOut = true;
          }
        }
      }
    }
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
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return NaN;
    const num = parseFloat(value);
    if (!/[%vh]/.test(value)) return num;
    const height = value.includes('vh')
      ? document.documentElement.clientHeight
      : (parent === window ? document.documentElement.clientHeight : parent.clientHeight);
    return (height * num) / 100;
  }
}

/**
 * Singleton export of the Animate controller.
 * @type {Animate}
 */
export const animate = new Animate();
