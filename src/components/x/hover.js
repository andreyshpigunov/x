//
//  hover.js / x
//  Hover sync module
//
//  Created by Andrey Shpigunov at 12.04.2025
//  All rights reserved.
//
//  This module synchronizes hover effects across elements with the same href attribute.
//  It listens for mouseenter and mouseleave events on elements with [x-hover].
//
//  When an element with [x-hover] and href is hovered,
//  all elements with the same href will receive the .hover class.
//
//  Available methods:
//    hover() — initializes global hover sync behavior
//

import { lib } from './lib';

/**
 * Initializes hover synchronization by attaching event listeners
 * for `mouseenter` and `mouseleave` to the document.
 *
 * Applies the 'hover' class to all elements with the same href when one is hovered.
 */
export function hover() {
  // Attach event listeners in the capture phase to ensure early detection
  ['mouseenter', 'mouseleave'].forEach(event =>
    document.addEventListener(event, handleHover, true)
  );
}

/**
 * Handles mouseenter/mouseleave events and toggles the 'hover' class
 * on all elements that share the same href as the hovered [x-hover] element.
 *
 * @param {MouseEvent} event - The mouse event triggered by user interaction.
 */
function handleHover(event) {
  // Ensure the event target is part of the current document
  if (!document.contains(event.target)) return;

  // Find the nearest ancestor with [x-hover] attribute
  const target = event.target.closest('[x-hover]');
  if (!target) return;

  // Read the href attribute of the hovered element
  const href = target.getAttribute('href');
  if (!href) return;

  // Determine method: add or remove class based on event type
  const method = event.type === 'mouseenter' ? 'addClass' : 'removeClass';

  // Apply or remove 'hover' class to all elements with matching href
  lib.qsa(`[href="${CSS.escape(href)}"]`).forEach(item => {
    lib[method](item, 'hover');
  });
}
