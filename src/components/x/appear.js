/**
 * @fileoverview Element appearing and visibility observer.
 *
 * Detects when elements enter or leave the viewport and applies CSS classes accordingly.
 * Intended for triggering animations, lazy loading, or visual effects.
 *
 * Exported singleton: `appear`
 *
 * Public API:
 *
 * - `appear.init(config)` – Initializes or reinitializes the observer.
 *
 * Usage example:
 *
 * HTML:
 * <div x-appear>Hello!</div>
 *
 * Behavior:
 * - Adds `appeared` class once when the element first appears.
 * - Adds `visible` class while the element is currently visible.
 *
 * Configuration via `init()`:
 * - `appearedClass` – Custom class for the first appearance (default: 'appeared').
 * - `visibleClass` – Custom class for current visibility (default: 'visible').
 * - `once` – If `true`, stops observing the element after first appearance.
 * - `rootMargin` – IntersectionObserver rootMargin (e.g. '50px' to trigger earlier).
 * - `threshold` – IntersectionObserver threshold, 0–1 (default: 0).
 * - `root` – IntersectionObserver root (null = viewport; element = scroll container).
 *
 * Events:
 * - `visible` – Dispatched when the element becomes visible.
 * - `invisible` – Dispatched when the element leaves the viewport.
 *
 * Next.js: call init() in useEffect(); on route change call destroy() in cleanup and init() after mount.
 * SSR-safe: init/destroy no-op when window is undefined.
 *
 * @example
 * // Next.js — _app.tsx or layout
 * import { useEffect } from 'react';
 * import { usePathname } from 'next/navigation';
 * import { appear } from '@andreyshpigunov/x/appear';
 *
 * export default function App({ Component, pageProps }) {
 *   const pathname = usePathname();
 *
 *   useEffect(() => {
 *     appear.init(); // or appear.init({ once: true, rootMargin: '50px' })
 *     return () => appear.destroy();
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
 * Element appearing and visibility observer.
 *
 * Uses IntersectionObserver to track elements with [x-appear] attribute and manage classes.
 */
class Appear {

  constructor() {
    this._targets = [];
    this._observer = null;
    this._options = {
      appearedClass: 'appeared',
      visibleClass: 'visible',
      once: false,
      root: null,
      rootMargin: '0px',
      threshold: 0
    };
    this._observerCallback = this._observerCallback.bind(this);
  }

  /**
   * Initializes or reinitializes the observer and starts observing elements.
   *
   * @param {Object} [config={}] - Optional configuration object.
   * @param {string} [config.appearedClass='appeared'] - Class added once when the element first appears.
   * @param {string} [config.visibleClass='visible'] - Class added while the element is visible.
   * @param {boolean} [config.once=false] - If true, stops observing after first appearance.
   *
   * @example
   * appear.init({ once: true });
   */
  init(config = {}) {
    if (typeof window === 'undefined') return;
    if (!('IntersectionObserver' in window)) return;

    this._options = { ...this._options, ...config };

    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }

    this._targets = lib.qsa('[x-appear]');
    if (!this._targets.length) return;

    const { root, rootMargin, threshold } = this._options;
    this._observer = new IntersectionObserver(this._observerCallback, { root: root || null, rootMargin, threshold });
    for (let i = 0; i < this._targets.length; i++) {
      this._observer.observe(this._targets[i]);
    }
  }

  /**
   * Stops observing all elements and resets state. Use when unmounting (e.g. SPA).
   */
  destroy() {
    if (typeof window === 'undefined') return;
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    this._targets = [];
  }

  /**
   * IntersectionObserver callback. Handles visibility changes for tracked elements.
   *
   * @param {IntersectionObserverEntry[]} entries - Array of observer entries.
   * @private
   */
  _observerCallback(entries) {
    const { appearedClass, visibleClass, once } = this._options;
    const observer = this._observer;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const target = entry.target;
      if (entry.isIntersecting) {
        if (appearedClass && !target.classList.contains(appearedClass)) {
          target.classList.add(appearedClass);
          if (once && observer) observer.unobserve(target);
        }
        if (visibleClass && !target.classList.contains(visibleClass)) {
          target.classList.add(visibleClass);
          target.dispatchEvent(new CustomEvent('visible', { detail: { appeared: true } }));
        }
      } else {
        if (visibleClass && target.classList.contains(visibleClass)) {
          target.classList.remove(visibleClass);
          target.dispatchEvent(new CustomEvent('invisible', { detail: { appeared: true } }));
        }
      }
    }
  }
}

/**
 * Singleton export of the Appear observer.
 * @type {Appear}
 */
export const appear = new Appear();
