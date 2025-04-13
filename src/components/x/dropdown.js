//
//  dropdown.js / x
//  Dropdown menu logic
//
//  Created by Andrey Shpigunov at 12.04.2025
//  All rights reserved.
//
//  This module provides behavior for toggling dropdown menus.
//  Supports keyboard accessibility, click to open, click outside to close,
//  and custom event hooks for show/hide.
//
//  HTML example:
//  <div id="menu">
//    <button x-dropdown-open>Open</button>
//    <ul x-dropdown>
//      <li>Menu item</li>
//    </ul>
//  </div>
//
//  Script usage:
//    menu.addEventListener('dropdown:ready',      event => { ... });
//    menu.addEventListener('dropdown:beforeshow', event => { ... });
//    menu.addEventListener('dropdown:aftershow',  event => { ... });
//    menu.addEventListener('dropdown:beforehide', event => { ... });
//    menu.addEventListener('dropdown:afterhide',  event => { ... });
//
//  Available methods:
//    init()                          — Initializes all [x-dropdown] in the DOM
//    toggleDropdown(parent, trigger) — Toggles visibility of a single dropdown
//    openDropdown(parent, trigger)   — Opens a dropdown manually
//    closeAllDropdowns()             — Closes all open dropdowns globally
//    attachGlobalListeners()         — Adds global click / key listeners
//

import { lib } from './lib';

class Dropdown {

  constructor() {
    // Attach global click/escape listeners once
    this.attachGlobalListeners();
  }

  /**
   * Initializes all dropdown components in the DOM.
   * Binds click and keyboard events to [x-dropdown-open] buttons.
   */
  init() {
    lib.qsa('[x-dropdown]').forEach(menu => {
      const parent = menu.parentElement;
      const trigger = lib.qs('[x-dropdown-open]', parent);

      if (!trigger) return;

      // Add base class for styling
      parent.classList.add('dropdown');

      // Set accessibility attributes
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', menu.id || '');
      menu.setAttribute('role', 'menu');
      menu.setAttribute('tabindex', '-1');

      // Toggle dropdown on click
      trigger.addEventListener('click', e => {
        e.stopPropagation(); // Prevent closing by global listener
        this.toggleDropdown(parent, trigger);
      });

      // Open dropdown with keyboard ArrowDown key
      trigger.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.openDropdown(parent, trigger);
        }
      });

      // Dispatch custom ready event
      parent.dispatchEvent(new CustomEvent('dropdown:ready'));
    });
  }

  /**
   * Toggles dropdown visibility: opens it if closed, closes others.
   * @param {Element} parent - The container element with class 'dropdown'.
   * @param {Element} trigger - The button element that toggles the dropdown.
   */
  toggleDropdown(parent, trigger) {
    const isOpened = parent.classList.contains('dropdown_open');
    this.closeAllDropdowns();

    if (!isOpened) {
      this.openDropdown(parent, trigger);
    }
  }

  /**
   * Opens a single dropdown and fires related custom events.
   * @param {Element} parent - The dropdown container.
   * @param {Element} trigger - The button element that opens the dropdown.
   */
  openDropdown(parent, trigger) {
    parent.dispatchEvent(new CustomEvent('dropdown:beforeshow'));
    lib.addClass(trigger, 'active');                     // Highlight trigger
    lib.addClass(parent, 'dropdown_open', 20);           // Open dropdown after 20ms
    trigger.setAttribute('aria-expanded', 'true');       // Accessibility attribute
    parent.dispatchEvent(new CustomEvent('dropdown:aftershow'));
  }

  /**
   * Closes all open dropdowns on the page.
   * Fires related custom events and removes active classes/ARIA attributes.
   */
  closeAllDropdowns() {
    lib.qsa('.dropdown_open').forEach(openMenu => {
      const trigger = lib.qs('[x-dropdown-open]', openMenu);

      openMenu.dispatchEvent(new CustomEvent('dropdown:beforehide'));

      if (trigger) {
        lib.removeClass(trigger, 'active');
        trigger.setAttribute('aria-expanded', 'false');
      }

      lib.removeClass(openMenu, 'dropdown_open', 200);
      openMenu.dispatchEvent(new CustomEvent('dropdown:afterhide'));
    });
  }

  /**
   * Attaches global event listeners for:
   * - closing dropdowns when clicking outside
   * - closing dropdowns when pressing Escape
   */
  attachGlobalListeners() {
    // Prevent attaching multiple times
    if (Dropdown._listenersAttached) return;

    // Click anywhere outside dropdown closes all
    document.addEventListener('click', e => {
      if (
        !e.target.closest('[x-dropdown-open]') &&
        !e.target.closest('[x-dropdown] .dropdown_stay')
      ) {
        this.closeAllDropdowns();
      }
    });

    // Pressing Escape closes all dropdowns
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.closeAllDropdowns();
      }
    });

    Dropdown._listenersAttached = true;
  }
}

// Static property to track if listeners are already set
Dropdown._listenersAttached = false;

// Export a singleton instance
export const dropdown = new Dropdown();
