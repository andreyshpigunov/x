/**
 * @fileoverview Hover synchronization module.
 *
 * Synchronizes hover effects across all elements with the same `href` attribute.
 * When one `[x-hover]` element is hovered, all matching elements get the 'hover' class.
 *
 * Exported function: `hover`
 *
 * Public API:
 *
 * - `hover()` – Initializes global hover synchronization.
 *
 * Example usage:
 *
 * HTML:
 * <a href="/about" x-hover>About</a>
 * <a href="/about" x-hover>Learn More</a>
 *
 * JS:
 * import { hover } from './hover.js';
 * hover();
 *
 * Behavior:
 * - When one link is hovered, all links with the same href receive `.hover` class.
 * - When mouse leaves, all matching links lose `.hover` class.
 *
 * @author Andrey Shpigunov
 * @version 0.2
 * @since 2025-07-17
 */

import { lib } from './lib';

/**
 * Initializes global hover synchronization by attaching event listeners.
 *
 * Listens to `mouseenter` and `mouseleave` events in the capture phase.
 * Targets elements with `[x-hover]` and synchronizes their hover states across all elements
 * sharing the same `href` attribute.
 *
 * @example
 * hover();
 */
export function hover() {
  document.addEventListener('mouseenter', handleHoverEnter, true);
  document.addEventListener('mouseleave', handleHoverLeave, true);
}

/**
 * Handles `mouseenter` event.
 * Adds the 'hover' class to all elements with the same `href` as the hovered `[x-hover]` element.
 *
 * @param {MouseEvent} event - The mouseenter event object.
 * @private
 */
function handleHoverEnter(event) {
  syncHover(event, true);
}

/**
 * Handles `mouseleave` event.
 * Removes the 'hover' class from all elements with the same `href` as the hovered `[x-hover]` element.
 *
 * @param {MouseEvent} event - The mouseleave event object.
 * @private
 */
function handleHoverLeave(event) {
  syncHover(event, false);
}

/**
 * Synchronizes the hover state by toggling the 'hover' class on all elements
 * with the same `href` as the event target.
 *
 * @param {MouseEvent} event - The mouse event triggering the sync.
 * @param {boolean} isEnter - `true` for mouseenter, `false` for mouseleave.
 * @private
 */
function syncHover(event, isEnter) {
  const target = event.target instanceof Element
    ? event.target.closest('[x-hover]')
    : null;
  if (!target) return;

  const href = target.getAttribute('href');
  if (!href) return;

  const elements = lib.qsa(`[href="${CSS.escape(href)}"]`);

  for (const el of elements) {
    el.classList.toggle('hover', isEnter);
  }
}
