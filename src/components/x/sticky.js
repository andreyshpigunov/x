/**
 * @fileoverview Sticky scroll behavior controller with events.
 *
 * Watches `.sticky` elements and toggles a CSS class when they scroll out of full viewport visibility.
 * Uses IntersectionObserver API for efficient viewport detection. Fires custom events on state changes.
 *
 * Exported singleton: `sticky`
 *
 * Usage:
 *
 * Basic setup:
 *   import { sticky } from './sticky.js';
 *   sticky.init();
 *
 * HTML structure:
 *   <header class="sticky">
 *     <nav>Navigation</nav>
 *   </header>
 *
 * CSS:
 *   .sticky {
 *     position: sticky;
 *     top: 0;
 *     z-index: 100;
 *   }
 *   .sticky.sticky_on {
 *     box-shadow: 0 2px 4px rgba(0,0,0,0.1);
 *   }
 *
 * Event listeners:
 *   const stickyElement = document.querySelector('.sticky');
 *   stickyElement.addEventListener('sticky:on', () => {
 *     console.log('Element became sticky');
 *     // Add shadow, change background, etc.
 *   });
 *   stickyElement.addEventListener('sticky:off', () => {
 *     console.log('Element returned to normal flow');
 *   });
 *
 * Multiple sticky elements:
 *   <header class="sticky">Header</header>
 *   <div class="content">Content</div>
 *   <aside class="sticky">Sidebar</aside>
 *   All elements are observed independently
 *
 * Public API:
 *
 * @method init() - Starts observing all `.sticky` elements.
 *   Finds all elements with `.sticky` class and begins observing them.
 *   Safe to call multiple times - automatically resets previous observation.
 *   @example
 *     sticky.init();
 *
 * @method reset() - Stops observing all sticky elements.
 *   Unobserves all elements and removes observation flags.
 *   Elements remain in DOM but are no longer watched.
 *   @example
 *     sticky.reset();
 *
 * @method destroy() - Fully disconnects observer and clears state.
 *   Completely removes IntersectionObserver and resets initialization flag.
 *   Use when you need to completely clean up.
 *   @example
 *     sticky.destroy();
 *
 * Custom Events:
 *
 * - `sticky:on` - Fired when element becomes sticky (scrolls out of viewport)
 *   - Bubbles: true
 *   - Target: The sticky element
 *
 * - `sticky:off` - Fired when element returns to normal flow (fully visible)
 *   - Bubbles: true
 *   - Target: The sticky element
 *
 * CSS classes:
 *
 * - `.sticky` - Required class to mark element for observation
 * - `.sticky_on` - Added when element is in sticky state (not fully visible)
 * - Removed when element returns to normal flow
 *
 * How it works:
 *
 * 1. IntersectionObserver watches `.sticky` elements
 * 2. Uses threshold: 1 (element must be fully visible)
 * 3. Uses rootMargin: '-1px 0px 0px 0px' (triggers when top edge leaves viewport)
 * 4. When intersectionRatio < 1, element is sticky
 * 5. Toggles `sticky_on` class and dispatches events
 *
 * Observer configuration:
 *
 * - threshold: 1 - Element must be fully visible
 * - rootMargin: '-1px 0px 0px 0px' - Triggers 1px before top edge leaves viewport
 * - This ensures class is added exactly when element starts sticking
 *
 * SECURITY:
 *
 * - No security issues identified
 * - Uses safe DOM APIs (IntersectionObserver, CustomEvent)
 * - No user input processing
 * - No XSS vulnerabilities
 *
 * Best practices:
 *
 * - Use semantic HTML for sticky elements
 * - Test sticky behavior with different content heights
 * - Consider accessibility (focus management)
 * - Use CSS transitions for smooth state changes
 * - Handle events to update UI (shadows, backgrounds, etc.)
 *
 * Browser support:
 *
 * - Requires IntersectionObserver API support
 * - Modern browsers (Chrome 51+, Firefox 55+, Safari 12.1+, Edge 15+)
 * - Falls back gracefully if not supported (no errors, just no functionality)
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
     * @type {IntersectionObserver|null}
     * @private
     */
    this._observer = null;

    /**
     * Initialization flag.
     * @type {boolean}
     * @private
     */
    this._initialized = false;

    this._initObserver();
  }

  /**
   * Initializes IntersectionObserver if supported.
   * @private
   */
  _initObserver() {
    if (!('IntersectionObserver' in window)) {
      console.warn('sticky: IntersectionObserver is not supported');
      return;
    }

    this._observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry && entry.target) {
            this._handleEntry(entry);
          }
        }
      },
      {
        threshold: 1,
        rootMargin: this.rootMargin
      }
    );
  }

  /**
   * Handles IntersectionObserver entry.
   * Toggles class and dispatches custom events.
   *
   * @param {IntersectionObserverEntry} entry
   * @private
   */
  _handleEntry(entry) {
    if (!entry || !entry.target) return;

    const el = entry.target;
    if (!(el instanceof HTMLElement)) return;

    const isSticky = entry.intersectionRatio < 1;
    const wasSticky = el.classList.contains(this.activeClass);

    // Only toggle if state changed
    if (isSticky !== wasSticky) {
      if (isSticky) {
        el.classList.add(this.activeClass);
        el.dispatchEvent(new CustomEvent('sticky:on', { bubbles: true }));
      } else {
        el.classList.remove(this.activeClass);
        el.dispatchEvent(new CustomEvent('sticky:off', { bubbles: true }));
      }
    }
  }

  /**
   * Initializes observation of `.sticky` elements.
   */
  init() {
    if (!this._observer) {
      console.warn('sticky.init: IntersectionObserver is not available');
      return;
    }

    if (this._initialized) {
      this.reset();
    }

    const stickies = lib.qsa('.sticky');
    for (const item of stickies) {
      if (!item || !(item instanceof HTMLElement)) continue;

      if (!item.dataset.stickyObserved) {
        try {
          this._observer.observe(item);
          item.dataset.stickyObserved = 'true';
        } catch (err) {
          console.error('sticky.init: Error observing element', item, err);
        }
      }
    }

    this._initialized = true;
  }

  /**
   * Stops observing all sticky elements and removes dataset flags.
   */
  reset() {
    if (!this._observer) return;

    const stickies = lib.qsa('.sticky');
    for (const item of stickies) {
      if (!item || !(item instanceof HTMLElement)) continue;

      if (item.dataset.stickyObserved) {
        try {
          if (document.body.contains(item)) {
            this._observer.unobserve(item);
          }
          delete item.dataset.stickyObserved;
        } catch (err) {
          console.error('sticky.reset: Error unobserving element', item, err);
          delete item.dataset.stickyObserved;
        }
      }
    }
  }

  /**
   * Fully disconnects observer and clears state.
   */
  destroy() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    this._initialized = false;
  }
}

/**
 * Singleton export of Sticky.
 * @type {Sticky}
 */
export const sticky = new Sticky();
