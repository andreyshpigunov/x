/**
 * @fileoverview Hover synchronization module for synchronized hover effects.
 *
 * Synchronizes hover effects across all elements with the same `href` attribute.
 * When one `[x-hover]` element is hovered, all matching elements automatically receive the 'hover' class.
 * Useful for creating synchronized hover effects across navigation menus, links, or buttons.
 *
 * Exported: `Hover` class and `hover` singleton instance.
 *
 * Usage:
 *
 * Basic setup (singleton, recommended):
 *   import { hover } from './hover.js';
 *   hover.init();
 *
 * Using class instance:
 *   import { Hover } from './hover.js';
 *   const myHover = new Hover();
 *   myHover.init();
 *
 * HTML structure:
 *   <nav>
 *     <a href="/about" x-hover>About</a>
 *     <a href="/contact" x-hover>Contact</a>
 *   </nav>
 *
 *   <footer>
 *     <a href="/about" x-hover>Learn More</a>
 *     <a href="/contact" x-hover>Get in Touch</a>
 *   </footer>
 *
 * Behavior:
 *   - When hovering over any link with `href="/about"` and `x-hover` attribute,
 *     all other links with the same `href` will also receive the `.hover` class.
 *   - When mouse leaves, all matching links lose the `.hover` class simultaneously.
 *   - Works across different parts of the page (header, footer, sidebar, etc.)
 *
 * CSS styling:
 *   a[href="/about"] {
 *     transition: color 0.3s;
 *   }
 *   a[href="/about"].hover {
 *     color: #007bff;
 *   }
 *
 * Advanced example with multiple elements:
 *   <a href="/products" x-hover>Products</a>
 *   <button data-href="/products" x-hover>View Products</button>
 *   <span data-href="/products" x-hover>Products Link</span>
 *
 *   Note: Only elements with `href` attribute are synchronized.
 *   Elements with `data-href` or other attributes are not supported.
 *
 * Public API:
 *
 * @class Hover
 *
 * @method init() - Initializes global hover synchronization.
 *   Attaches event listeners to the document for mouseenter and mouseleave events.
 *   Safe to call multiple times (no-op after first call). SSR-safe: no-op when document is undefined.
 *
 * @method destroy() - Removes document listeners and resets state. Use on SPA unmount / Next.js.
 *
 *   @example
 *     import { hover } from './hover.js';
 *     hover.init();
 *
 * How it works:
 *
 * 1. Listens to `mouseenter` and `mouseleave` events on the document (capture phase).
 * 2. When an element with `[x-hover]` attribute is hovered:
 *    - Finds the `href` attribute value
 *    - Searches for all elements with the same `href` value
 *    - Adds/removes `.hover` class to all matching elements
 *
 * Requirements:
 *
 * - Elements must have `[x-hover]` attribute
 * - Elements must have `href` attribute (for links) or similar attribute
 * - CSS class `.hover` should be styled for visual feedback
 *
 * Performance:
 *
 * - Uses event delegation (listeners on document, not individual elements)
 * - Efficient CSS selector matching with `CSS.escape()` for special characters
 * - Minimal DOM manipulation (only toggles class on matching elements)
 *
 * Next.js: call hover.init() in useEffect; in cleanup call hover.destroy().
 *
 * @example
 * // Next.js — layout or _app
 * useEffect(() => {
 *   hover.init();
 *   return () => hover.destroy();
 * }, []);
 *
 * @author Andrey Shpigunov
 * @version 0.3
 * @since 2026-02-02
 */

import { lib } from './lib';

/**
 * Hover synchronization controller.
 * Listens to mouseenter/mouseleave on document and syncs .hover class across [x-hover] elements with same href.
 *
 * Singleton pattern: use `import { hover } from './hover.js'` and hover.init() / hover.destroy().
 */
export class Hover {
  constructor() {
    /** @type {boolean} @private */
    this._initialized = false;
    /** @type {function(MouseEvent): void} @private */
    this._boundEnter = this._handleEnter.bind(this);
    /** @type {function(MouseEvent): void} @private */
    this._boundLeave = this._handleLeave.bind(this);
  }

  /**
   * Initializes global hover synchronization.
   * Listens to mouseenter/mouseleave in capture phase. SSR-safe: no-op when document undefined.
   */
  init() {
    if (typeof document === 'undefined' || this._initialized) return;
    this._initialized = true;
    document.addEventListener('mouseenter', this._boundEnter, true);
    document.addEventListener('mouseleave', this._boundLeave, true);
  }

  /**
   * Removes document listeners and resets state. Use on SPA unmount or Next.js cleanup.
   * SSR-safe: no-op when document is undefined.
   */
  destroy() {
    if (typeof document === 'undefined' || !this._initialized) return;
    document.removeEventListener('mouseenter', this._boundEnter, true);
    document.removeEventListener('mouseleave', this._boundLeave, true);
    this._initialized = false;
  }

  /**
   * Handles mouseenter. Adds .hover to all [x-hover] elements with the same href.
   * @param {MouseEvent} event
   * @private
   */
  _handleEnter(event) {
    this._syncHover(event, true);
  }

  /**
   * Handles mouseleave. Removes .hover from all [x-hover] elements with the same href.
   * @param {MouseEvent} event
   * @private
   */
  _handleLeave(event) {
    this._syncHover(event, false);
  }

  /**
   * Toggles .hover on all [x-hover] elements with the same href as the event target.
   * @param {MouseEvent} event
   * @param {boolean} isEnter
   * @private
   */
  _syncHover(event, isEnter) {
    const target = event?.target;
    if (!target || typeof target.closest !== 'function') return;

    const root = target.closest('[x-hover]');
    if (!root) return;

    const href = root.getAttribute('href');
    if (href == null || href.trim() === '') return;

    if (typeof CSS === 'undefined' || typeof CSS.escape !== 'function') return;

    try {
      const escaped = CSS.escape(href);
      const list = lib.qsa(`[x-hover][href="${escaped}"]`);
      for (let i = 0; i < list.length; i++) {
        list[i].classList.toggle('hover', isEnter);
      }
    } catch (_) {}
  }
}

/** @type {Hover} */
export const hover = new Hover();
