 /**
  * @fileoverview Sticky scroll behavior controller with events.
  *
  * Watches `.sticky` elements and toggles a CSS class when they scroll out of full viewport visibility.
  * Fires `sticky:on` and `sticky:off` events on the target elements.
  *
  * Behavior:
  * - Adds `sticky_on` class when element becomes sticky.
  * - Removes `sticky_on` class when element returns to normal flow.
  * - Dispatches `CustomEvent` (`sticky:on` / `sticky:off`) on state changes.
  *
  * Usage example:
  *
  * HTML:
  * <div class="sticky">Header</div>
  *
  * JS:
  * sticky.init();
  *
  * document.querySelector('.sticky').addEventListener('sticky:on', () => {
  *   console.log('Sticky enabled');
  * });
  *
  * document.querySelector('.sticky').addEventListener('sticky:off', () => {
  *   console.log('Sticky disabled');
  * });
  *
  * Public API:
  * - `sticky.init()` – Start observing `.sticky` elements.
  * - `sticky.reset()` – Stop observing all elements.
  * - `sticky.destroy()` – Remove observers and clear state.
  *
  * @author Andrey Shpigunov
  * @version 0.2
  * @since 2025-07-17
  */

import { lib } from './lib';

/**
 * Sticky scroll behavior controller with events.
 */
class Sticky {
  /**
   * Creates Sticky instance and configures observer.
   */
  constructor() {
    /**
     * Class to apply when sticky state is active.
     * @type {string}
     */
    this.activeClass = 'sticky_on';

    /**
     * Root margin for IntersectionObserver.
     * @type {string}
     */
    this.rootMargin = '-1px 0px 0px 0px';

    /**
     * IntersectionObserver instance.
     * @type {IntersectionObserver}
     * @private
     */
    this._observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          this._handleEntry(entry);
        }
      },
      {
        threshold: 1,
        rootMargin: this.rootMargin
      }
    );

    /**
     * Initialization flag.
     * @type {boolean}
     * @private
     */
    this._initialized = false;
  }

  /**
   * Handles IntersectionObserver entry.
   * Toggles class and dispatches custom events.
   *
   * @param {IntersectionObserverEntry} entry
   * @private
   */
  _handleEntry(entry) {
    const isSticky = entry.intersectionRatio < 1;
    const el = entry.target;

    const wasSticky = el.classList.contains(this.activeClass);

    lib.switchClass(el, this.activeClass, isSticky);

    if (isSticky && !wasSticky) {
      el.dispatchEvent(new CustomEvent('sticky:on', { bubbles: true }));
    }

    if (!isSticky && wasSticky) {
      el.dispatchEvent(new CustomEvent('sticky:off', { bubbles: true }));
    }
  }

  /**
   * Initializes observation of `.sticky` elements.
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
   * Stops observing all sticky elements and removes dataset flags.
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

  /**
   * Fully disconnects observer and clears state.
   */
  destroy() {
    this._observer.disconnect();
    this._initialized = false;
  }
}

/**
 * Singleton export of Sticky.
 * @type {Sticky}
 */
export const sticky = new Sticky();
