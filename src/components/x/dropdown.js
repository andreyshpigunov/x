/**
 * @fileoverview Dropdown menu controller.
 *
 * Provides dropdown functionality with keyboard support, accessibility, and dynamic positioning.
 * Automatically handles multiple dropdowns on the page.
 *
 * Exported singleton: `dropdown`
 *
 * Public API:
 *
 * - `dropdown.init()`            – Initializes all dropdown menus in the DOM.
 * - `dropdown.closeAllDropdowns()` – Closes all open dropdown menus.
 *
 * Events dispatched on the parent element:
 *
 * - `dropdown:ready`      – After each menu is initialized.
 * - `dropdown:beforeshow` – Before the dropdown opens.
 * - `dropdown:aftershow`  – After the dropdown opens.
 * - `dropdown:beforehide` – Before the dropdown closes.
 * - `dropdown:afterhide`  – After the dropdown closes.
 *
 * Example usage:
 *
 * HTML:
 * <div>
 *   <button x-dropdown-open>Menu</button>
 *   <ul x-dropdown>
 *     <li><a href="#">Item 1</a></li>
 *     <li><a href="#">Item 2</a></li>
 *   </ul>
 * </div>
 *
 * JS:
 * import { dropdown } from './dropdown.js';
 * dropdown.init();
 *
 * @author Andrey Shpigunov
 * @version 0.2
 * @since 2025-07-17
 */

import { lib } from './lib';

/**
 * Dropdown menu controller.
 *
 * Features:
 * - Supports multiple dropdowns on the page.
 * - Keyboard navigation (Enter, Space, ArrowDown, ArrowUp, Home, End, Escape).
 * - Automatic positioning with overflow handling (adds `.dropdown_right`, `.dropdown_bottom`).
 * - Adds `.hover` class on focus for triggers and menu items.
 * - Safe `init()` with cleanup and reinitialization support.
 *
 * Singleton pattern: use `import { dropdown } from './dropdown.js'`.
 */
class Dropdown {
  constructor() {
    /**
     * Stores event handlers for each element (trigger/menu).
     * @type {Map<HTMLElement, Object>}
     * @private
     */
    this._handlers = new Map();

    /**
     * Stores menu elements with their related triggers and parents.
     * @type {Map<HTMLElement, {parent: HTMLElement, trigger: HTMLElement}>}
     * @private
     */
    this._menus = new Map();

    /**
     * Indicates whether `init()` has been called.
     * @type {boolean}
     * @private
     */
    this._initialized = false;

    this._attachGlobalListeners();
  }

  /**
   * Initializes all dropdown menus in the DOM.
   *
   * Safe to call multiple times. Automatically removes old event listeners before reinitialization.
   *
   * @example
   * dropdown.init();
   */
  init() {
    if (this._initialized) this._cleanup();

    lib.qsa('[x-dropdown]').forEach(menu => {
      const parent = menu.parentElement;
      const trigger = lib.qs('[x-dropdown-open]', parent);
      if (!trigger) return;

      this._setupAccessibility(parent, trigger, menu);
      this._bindTrigger(parent, trigger);
      this._bindMenuKeys(menu, trigger, parent);

      this._menus.set(menu, { parent, trigger });

      parent.dispatchEvent(new CustomEvent('dropdown:ready'));
    });

    this._initialized = true;
  }

  /**
   * Prepares ARIA attributes and focus behavior for accessibility.
   *
   * @param {HTMLElement} parent - The dropdown container.
   * @param {HTMLElement} trigger - The trigger button.
   * @param {HTMLElement} menu - The dropdown menu.
   * @private
   */
  _setupAccessibility(parent, trigger, menu) {
    parent.classList.add('dropdown');
    trigger.setAttribute('aria-expanded', 'false');
    if (!menu.id) menu.id = lib.makeId();
    trigger.setAttribute('aria-controls', menu.id);
    menu.setAttribute('role', 'menu');
    menu.setAttribute('tabindex', '-1');

    menu.querySelectorAll('li > a').forEach(item => {
      item.setAttribute('role', 'menuitem');
      item.setAttribute('tabindex', '-1');
    });

    trigger.addEventListener('focus', () => trigger.classList.add('hover'));
    trigger.addEventListener('blur', () => trigger.classList.remove('hover'));
  }

  /**
   * Binds click and keyboard events to the trigger element.
   *
   * @param {HTMLElement} parent - The dropdown container.
   * @param {HTMLElement} trigger - The trigger button.
   * @private
   */
  _bindTrigger(parent, trigger) {
    const throttledHandler = lib.throttle(() => this._toggleDropdown(parent, trigger), 400);
  
    const isInputLike = ['INPUT', 'TEXTAREA'].includes(trigger.tagName);
    let blurTimeout = null;
  
    const clickListener = e => {
      if (!isInputLike) {
        e.stopPropagation();
        throttledHandler();
      }
    };
  
    const keyListener = e => {
      if (e.key === ' ' && isInputLike) {
        return;
      }
      
      if (!isInputLike && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        throttledHandler();
      }
  
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isInputLike) {
          this._open(parent, trigger);
          this._focusFirstItem(parent);
        }
      }
  
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isInputLike) {
          this._open(parent, trigger);
          this._focusLastItem(parent);
        }
      }
    };
  
    const focusListener = e => {
      if (isInputLike) {
        clearTimeout(blurTimeout);
        this.closeAllDropdowns();
        this._open(parent, trigger);
      } else {
        trigger.classList.add('hover');
      }
    };
  
    const blurListener = e => {
      if (isInputLike) {
        blurTimeout = setTimeout(() => this._close(parent), 200);
      } else {
        trigger.classList.remove('hover');
      }
    };
  
    this._handlers.set(trigger, {
      clickListener,
      keyListener,
      focusListener,
      blurListener,
      blurTimeout,
    });
  
    trigger.addEventListener('click', clickListener);
    trigger.addEventListener('keydown', keyListener);
    trigger.addEventListener('focus', focusListener);
    trigger.addEventListener('blur', blurListener);
  }

  /**
   * Binds keyboard navigation and hover behavior to the menu.
   *
   * @param {HTMLElement} menu - The dropdown menu.
   * @param {HTMLElement} trigger - The trigger button.
   * @param {HTMLElement} parent - The dropdown container.
   * @private
   */
  _bindMenuKeys(menu, trigger, parent) {
    const keyListener = e => {
      const items = Array.from(menu.querySelectorAll('[role="menuitem"]:not([disabled])'));
      const currentIndex = items.indexOf(document.activeElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (currentIndex + 1) % items.length;
        items[next].focus();
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = (currentIndex - 1 + items.length) % items.length;
        items[prev].focus();
      }

      if (e.key === 'Home') {
        e.preventDefault();
        items[0].focus();
      }

      if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1].focus();
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        this._close(parent);
        trigger.focus();
      }
    };

    const focusListener = e => {
      if (e.target.matches('[role="menuitem"]')) {
        e.target.classList.add('hover');
      }
    };

    const blurListener = e => {
      if (e.target.matches('[role="menuitem"]')) {
        e.target.classList.remove('hover');
      }
    };

    this._handlers.set(menu, { keyListener, focusListener, blurListener });

    menu.addEventListener('keydown', keyListener);
    menu.addEventListener('focusin', focusListener);
    menu.addEventListener('focusout', blurListener);
  }

  /**
   * Removes all event listeners and clears internal state.
   *
   * @private
   */
  _cleanup() {
    this.closeAllDropdowns();

    this._handlers.forEach((handlers, element) => {
      if (handlers.clickListener) element.removeEventListener('click', handlers.clickListener);
      if (handlers.keyListener) element.removeEventListener('keydown', handlers.keyListener);
      if (handlers.focusListener) element.removeEventListener('focus', handlers.focusListener);
      if (handlers.blurListener) element.removeEventListener('blur', handlers.blurListener);
      
      if (handlers.focusListener) element.removeEventListener('focusin', handlers.focusListener);
      if (handlers.blurListener) element.removeEventListener('focusout', handlers.blurListener);
      
      if (handlers.blurTimeout) clearTimeout(handlers.blurTimeout);
    });

    this._handlers.clear();
    this._menus.clear();
  }

  /**
   * Toggles a specific dropdown menu.
   *
   * @param {HTMLElement} parent - The dropdown container.
   * @param {HTMLElement} trigger - The trigger button.
   * @private
   */
  _toggleDropdown(parent, trigger) {
    const isOpen = parent.classList.contains('dropdown_open');
    this.closeAllDropdowns();
    if (!isOpen) this._open(parent, trigger);
  }

  /**
   * Opens the dropdown menu and adjusts positioning.
   *
   * @param {HTMLElement} parent - The dropdown container.
   * @param {HTMLElement} trigger - The trigger button.
   * @private
   */
  async _open(parent, trigger) {
    // this.closeAllDropdowns();
    this._fireEvent(parent, 'beforeshow');

    const menu = parent.querySelector('[x-dropdown]');
    this._adjustPosition(parent, menu);

    lib.addClass(trigger, 'active');
    lib.addClass(parent, 'dropdown_open', 20);
    trigger.setAttribute('aria-expanded', 'true');

    this._fireEvent(parent, 'aftershow');
  }

  /**
   * Adjusts dropdown positioning to prevent overflow.
   *
   * @param {HTMLElement} parent - The dropdown container.
   * @param {HTMLElement} menu - The dropdown menu.
   * @private
   */
  _adjustPosition(parent, menu) {
    parent.classList.add('dropdown_ready');
    const rect = menu.getBoundingClientRect();
    parent.classList.remove('dropdown_ready');

    const vw = window.innerWidth;
    const docHeight = document.documentElement.scrollHeight;

    parent.classList.remove('dropdown_right', 'dropdown_bottom');

    if (rect.right > vw) {
      parent.classList.add('dropdown_right');
    }

    const menuBottomInDoc = window.scrollY + rect.bottom;
    if (menuBottomInDoc > docHeight) {
      parent.classList.add('dropdown_bottom');
    }
  }

  /**
   * Focuses the first focusable menu item.
   *
   * @param {HTMLElement} parent - The dropdown container.
   * @private
   */
  _focusFirstItem(parent) {
    const menu = parent.querySelector('[x-dropdown]');
    const firstItem = menu.querySelector('[role="menuitem"]:not([disabled])');
    if (firstItem) firstItem.focus();
  }

  /**
   * Focuses the last focusable menu item.
   *
   * @param {HTMLElement} parent - The dropdown container.
   * @private
   */
  _focusLastItem(parent) {
    const menu = parent.querySelector('[x-dropdown]');
    const items = menu.querySelectorAll('[role="menuitem"]:not([disabled])');
    if (items.length > 0) {
      items[items.length - 1].focus();
    }
  }

  /**
   * Closes all open dropdown menus.
   *
   * @example
   * dropdown.closeAllDropdowns();
   */
  closeAllDropdowns() {
    lib.qsa('.dropdown_open').forEach(parent => this._close(parent));
  }

  /**
   * Closes a specific dropdown and resets classes.
   *
   * @param {HTMLElement} parent - The dropdown container.
   * @private
   */
  async _close(parent) {
    if (parent._dropdownClosing) return;
    parent._dropdownClosing = true;
  
    this._fireEvent(parent, 'beforehide');
  
    const trigger = lib.qs('[x-dropdown-open]', parent);
    if (trigger) {
      lib.removeClass(trigger, 'active');
      trigger.setAttribute('aria-expanded', 'false');
    }
  
    await lib.removeClass(parent, 'dropdown_open', 200);
    parent.classList.remove('dropdown_right', 'dropdown_bottom');
  
    this._fireEvent(parent, 'afterhide');
  
    setTimeout(() => { parent._dropdownClosing = false }, 100);
  }

  /**
   * Dispatches a custom event on the dropdown container.
   *
   * @param {HTMLElement} parent - The dropdown container.
   * @param {string} phase - Event phase name.
   * @private
   */
  _fireEvent(parent, phase) {
    parent.dispatchEvent(new CustomEvent(`dropdown:${phase}`));
  }

  /**
   * Attaches a global click listener to close dropdowns when clicking outside.
   *
   * @private
   */
  _attachGlobalListeners() {
    if (Dropdown._globalListenersAttached) return;

    document.addEventListener('click', e => {
      if (!e.target.closest('[x-dropdown-open]') &&
          !e.target.closest('[x-dropdown] .dropdown_stay')) {
        this.closeAllDropdowns();
      }
    });

    Dropdown._globalListenersAttached = true;
  }
}

/**
 * Prevents multiple global listener attachments.
 * @type {boolean}
 * @private
 */
Dropdown._globalListenersAttached = false;

/**
 * Singleton export of the Dropdown controller.
 * @type {Dropdown}
 */
export const dropdown = new Dropdown();
