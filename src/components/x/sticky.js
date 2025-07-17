/**
 * @fileoverview Adds the 'sticky_on' class to elements with the 'sticky' class
 * when they are no longer fully visible in the viewport using IntersectionObserver.
 *
 * Public API:
 * - `sticky.init()` — Starts observing sticky elements.
 * - `sticky.reset()` — Stops observing all tracked sticky elements.
 *
 * Usage:
 * Import and call `sticky.init()` after DOM ready to enable sticky behavior.
 *
 * @author Andrey Shpigunov
 * @version 0.2
 * @since 2025-07-17
 */

import { lib } from './lib';

/**
 * Sticky class manages sticky elements visibility and toggles CSS class on scroll.
 */
class Sticky {
  /**
   * Creates a new Sticky instance and sets up the IntersectionObserver.
   */
  constructor() {
    /**
     * IntersectionObserver instance for observing sticky elements.
     * @type {IntersectionObserver}
     * @private
     */
    this._observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Toggle 'sticky_on' class based on visibility ratio
          lib.switchClass(entry.target, entry.intersectionRatio < 1, 'sticky_on');
        }
      },
      {
        threshold: 1,
        rootMargin: '-1px 0px 0px 0px'
      }
    );

    /**
     * Flag indicating whether initialization has been done.
     * @type {boolean}
     * @private
     */
    this._initialized = false;
  }

  /**
   * Initializes observation for all elements with the 'sticky' class.
   * Adds the 'sticky_on' class when the element is partially or fully out of viewport.
   */
  init() {
    if (this._initialized) {
      this.reset();
    }

    const stickies = lib.qsa('.sticky');
    for (const item of stickies) {
      if (!item.dataset.stickyObserved) {
        this._observer.observe(item);
        item.dataset.stickyObserved = 'true';
      }
    }

    this._initialized = true;
  }

  /**
   * Stops observing all currently tracked sticky elements and clears observation flags.
   */
  reset() {
    const stickies = lib.qsa('.sticky');
    for (const item of stickies) {
      if (item.dataset.stickyObserved) {
        if (document.body.contains(item)) {
          this._observer.unobserve(item);
        }
        delete item.dataset.stickyObserved;
      }
    }
  }
}

/**
 * Singleton instance of Sticky.
 * @type {Sticky}
 */
export const sticky = new Sticky();
