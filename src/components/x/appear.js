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
 *
 * Events:
 * - `visible` – Dispatched when the element becomes visible.
 * - `invisible` – Dispatched when the element leaves the viewport.
 *
 * @author Andrey Shpigunov
 * @version 0.2
 * @since 2025-07-17
 */

import { lib } from './lib';

/**
 * Element appearing and visibility observer.
 *
 * Uses IntersectionObserver to track elements with [x-appear] attribute and manage classes.
 */
class Appear {

  constructor() {
    /**
     * List of currently observed elements.
     * @type {HTMLElement[]}
     * @private
     */
    this._targets = [];

    /**
     * Instance of IntersectionObserver.
     * @type {IntersectionObserver|null}
     * @private
     */
    this._observer = null;

    /**
     * Observer options and behavior configuration.
     * @type {{
     *   appearedClass: string,
     *   visibleClass: string,
     *   once: boolean
     * }}
     * @private
     */
    this._options = {
      appearedClass: 'appeared',
      visibleClass: 'visible',
      once: false
    };

    /**
     * Indicates whether the observer has been initialized.
     * @type {boolean}
     * @private
     */
    this._initialized = false;
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
    if (!('IntersectionObserver' in window)) return;

    this._options = { ...this._options, ...config };

    this._targets = lib.qsa('[x-appear]');

    if (this._targets.length) {
      this._observer = new IntersectionObserver(this._observerCallback.bind(this));

      this._targets.forEach(item => {
        if (this._initialized) {
          this._observer.unobserve(item);
        }
        this._observer.observe(item);
      });
    }

    this._initialized = true;
  }

  /**
   * IntersectionObserver callback. Handles visibility changes for tracked elements.
   *
   * @param {IntersectionObserverEntry[]} entries - Array of observer entries.
   * @private
   */
  _observerCallback(entries) {
    const { appearedClass, visibleClass, once } = this._options;

    for (const entry of entries) {
      const target = entry.target;

      const hasAppeared = appearedClass != null;
      const hasVisible = visibleClass != null;

      if (entry.isIntersecting) {
        // First time visibility — add appeared class
        if (hasAppeared && !target.classList.contains(appearedClass)) {
          target.classList.add(appearedClass);

          if (once) {
            this._observer.unobserve(target);
          }
        }

        // While visible — add visible class and dispatch event
        if (hasVisible) {
          target.classList.add(visibleClass);
          target.dispatchEvent(new CustomEvent('visible', {
            detail: { appeared: true }
          }));
        }
      } else {
        // When leaving viewport — remove visible class and dispatch event
        if (hasVisible && target.classList.contains(visibleClass)) {
          target.classList.remove(visibleClass);
          target.dispatchEvent(new CustomEvent('invisible', {
            detail: { appeared: true }
          }));
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
