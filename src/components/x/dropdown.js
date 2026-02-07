/**
 * @fileoverview Dropdown menu controller with keyboard navigation and accessibility support.
 *
 * Provides dropdown functionality with keyboard support, accessibility (ARIA), and dynamic positioning.
 * Automatically handles multiple dropdowns on the page. Supports both button triggers and input fields.
 *
 * Exported singleton: `dropdown`
 *
 * Public API:
 *
 * - `dropdown.init()`            – Initializes all dropdown menus in the DOM.
 * - `dropdown.closeAllDropdowns()` – Closes all open dropdown menus.
 * - `dropdown.destroy()`         – Full teardown (listeners + global). Use on SPA unmount / Next.js.
 *
 * Next.js: call init() in useEffect() on client; call destroy() in cleanup (e.g. on unmount or route change).
 * SSR-safe: init/destroy no-op when document is undefined.
 *
 * Usage:
 *
 * Basic HTML structure:
 * ```html
 * <div>
 *   <button x-dropdown-open>Menu</button>
 *   <ul x-dropdown>
 *     <li><a href="#" role="menuitem">Item 1</a></li>
 *     <li><a href="#" role="menuitem">Item 2</a></li>
 *   </ul>
 * </div>
 * ```
 *
 * JavaScript initialization:
 * ```javascript
 * import { dropdown } from './dropdown.js';
 * dropdown.init();
 * ```
 *
 * With input field (autocomplete-style):
 * ```html
 * <div>
 *   <input type="text" x-dropdown-open placeholder="Search...">
 *   <ul x-dropdown>
 *     <li><a href="#" role="menuitem">Result 1</a></li>
 *     <li><a href="#" role="menuitem">Result 2</a></li>
 *   </ul>
 * </div>
 * ```
 *
 * Preventing auto-close on click:
 * ```html
 * <ul x-dropdown>
 *   <li class="dropdown--stay">
 *     <button>This area won't close dropdown</button>
 *   </li>
 * </ul>
 * ```
 *
 * Events dispatched on the parent element:
 *
 * - `dropdown:ready`      – Fired after each menu is initialized.
 * - `dropdown:beforeshow` – Fired before the dropdown opens.
 * - `dropdown:aftershow`  – Fired after the dropdown opens.
 * - `dropdown:beforehide` – Fired before the dropdown closes.
 * - `dropdown:afterhide`  – Fired after the dropdown closes.
 *
 * Event listener example:
 * ```javascript
 * const dropdownElement = document.querySelector('.dropdown');
 * dropdownElement.addEventListener('dropdown:aftershow', () => {
 *   console.log('Dropdown opened');
 * });
 * ```
 *
 * Keyboard navigation:
 *
 * - `Enter` / `Space` – Toggle dropdown (on trigger)
 * - `ArrowDown` – Open dropdown and focus first item (on trigger) / Move to next item (in menu)
 * - `ArrowUp` – Open dropdown and focus last item (on trigger) / Move to previous item (in menu)
 * - `Home` – Focus first item (in menu)
 * - `End` – Focus last item (in menu)
 * - `Escape` – Close dropdown and return focus to trigger
 *
 * CSS classes:
 *
 * - `.dropdown` – Added to parent container
 * - `.dropdown--open` – Added when dropdown is open
 * - `.dropdown--right` – Added when menu needs to align right (overflow prevention)
 * - `.dropdown--bottom` – Added when menu needs to align bottom (overflow prevention)
 * - `.dropdown--ready` – Temporarily added during position calculation
 * - `.active` – Added to trigger when dropdown is open
 * - `.hover` – Added on focus for better visual feedback
 *
 * Accessibility:
 *
 * - Automatically sets ARIA attributes (`aria-expanded`, `aria-controls`, `role`)
 * - Full keyboard navigation support
 * - Focus management
 * - Screen reader friendly
 *
 * @example
 * // Next.js — layout or _app
 * useEffect(() => {
 *   dropdown.init();
 *   return () => dropdown.destroy();
 * }, []);
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
 * - Automatic positioning with overflow handling (adds `.dropdown--right`, `.dropdown--bottom`).
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
     * Parent -> menu lookup to avoid repeated querySelector in _open / _focusFirstItem / _focusLastItem.
     * @type {Map<HTMLElement, HTMLElement>}
     * @private
     */
    this._parentToMenu = new Map();

    /**
     * Indicates whether `init()` has been called.
     * @type {boolean}
     * @private
     */
    this._initialized = false;

    /** @type {function(Event): void | null} */
    this._globalClickHandler = null;
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
    if (typeof document === 'undefined') return;
    if (this._initialized) this._cleanup();

    this._attachGlobalListeners();

    const menus = lib.qsa('[x-dropdown]');
    for (const menu of menus) {
      const parent = menu.parentElement;
      if (!parent) continue;

      const trigger = lib.qs('[x-dropdown-open]', parent);
      if (!trigger) continue;

      this._setupAccessibility(parent, trigger, menu);
      this._bindTrigger(parent, trigger);
      this._bindMenuKeys(menu, trigger, parent);

      this._menus.set(menu, { parent, trigger });
      this._parentToMenu.set(parent, menu);

      parent.dispatchEvent(new CustomEvent('dropdown:ready'));
    }

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

    const linkItems = menu.querySelectorAll('li > a');
    for (let i = 0; i < linkItems.length; i++) {
      const item = linkItems[i];
      item.setAttribute('role', 'menuitem');
      item.setAttribute('tabindex', '-1');
    }
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
    const tag = trigger.tagName;
    const isInputLike = tag === 'INPUT' || tag === 'TEXTAREA';
    let blurTimeout = null;

    const clickListener = e => {
      if (!isInputLike) {
        e.stopPropagation();
        throttledHandler();
      }
    };

    const keyListener = e => {
      const { key } = e;

      if (key === ' ' && isInputLike) return;

      if (!isInputLike && (key === 'Enter' || key === ' ')) {
        e.preventDefault();
        throttledHandler();
        return;
      }

      if (key === 'ArrowDown') {
        e.preventDefault();
        if (!isInputLike) {
          this._open(parent, trigger);
          this._focusFirstItem(parent);
        }
        return;
      }

      if (key === 'ArrowUp') {
        e.preventDefault();
        if (!isInputLike) {
          this._open(parent, trigger);
          this._focusLastItem(parent);
        }
      }
    };

    const focusListener = () => {
      if (isInputLike) {
        if (blurTimeout) clearTimeout(blurTimeout);
        this.closeAllDropdowns();
        this._open(parent, trigger);
      } else {
        trigger.classList.add('hover');
      }
    };

    const blurListener = () => {
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
      blurTimeout
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
      const items = menu.querySelectorAll('[role="menuitem"]:not([disabled])');
      const len = items.length;
      if (!len) return;

      let currentIndex = -1;
      const active = document.activeElement;
      for (let i = 0; i < len; i++) {
        if (items[i] === active) {
          currentIndex = i;
          break;
        }
      }

      const key = e.key;
      if (key === 'ArrowDown') {
        e.preventDefault();
        items[(currentIndex + 1) % len].focus();
        return;
      }
      if (key === 'ArrowUp') {
        e.preventDefault();
        items[(currentIndex - 1 + len) % len].focus();
        return;
      }
      if (key === 'Home') {
        e.preventDefault();
        items[0].focus();
        return;
      }
      if (key === 'End') {
        e.preventDefault();
        items[len - 1].focus();
        return;
      }
      if (key === 'Escape') {
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
      if (handlers.focusListener) {
        element.removeEventListener('focus', handlers.focusListener);
        element.removeEventListener('focusin', handlers.focusListener);
      }
      if (handlers.blurListener) {
        element.removeEventListener('blur', handlers.blurListener);
        element.removeEventListener('focusout', handlers.blurListener);
      }
      if (handlers.blurTimeout) clearTimeout(handlers.blurTimeout);
    });
    this._handlers.clear();
    this._menus.clear();
    this._parentToMenu.clear();

    if (Dropdown._globalListenersAttached && this._globalClickHandler) {
      document.removeEventListener('click', this._globalClickHandler);
      Dropdown._globalListenersAttached = false;
    }
  }

  /**
   * Toggles a specific dropdown menu.
   *
   * @param {HTMLElement} parent - The dropdown container.
   * @param {HTMLElement} trigger - The trigger button.
   * @private
   */
  _toggleDropdown(parent, trigger) {
    const isOpen = parent.classList.contains('dropdown--open');
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
    const menu = this._parentToMenu.get(parent);
    if (!menu) return;

    this._fireEvent(parent, 'beforeshow');
    this._adjustPosition(parent, menu);

    lib.addClass(trigger, 'active');
    lib.addClass(parent, 'dropdown--open', 20);
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
    parent.classList.add('dropdown--ready');
    const rect = menu.getBoundingClientRect();
    parent.classList.remove('dropdown--ready');

    const vw = window.innerWidth;
    const docHeight = document.documentElement.scrollHeight;

    parent.classList.remove('dropdown--right', 'dropdown--bottom');

    if (rect.right > vw) {
      parent.classList.add('dropdown--right');
    }

    const menuBottomInDoc = window.scrollY + rect.bottom;
    if (menuBottomInDoc > docHeight) {
      parent.classList.add('dropdown--bottom');
    }
  }

  /**
   * Focuses the first focusable menu item.
   *
   * @param {HTMLElement} parent - The dropdown container.
   * @private
   */
  _focusFirstItem(parent) {
    const menu = this._parentToMenu.get(parent);
    if (!menu) return;
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
    const menu = this._parentToMenu.get(parent);
    if (!menu) return;
    const items = menu.querySelectorAll('[role="menuitem"]:not([disabled])');
    if (items.length) items[items.length - 1].focus();
  }

  /**
   * Closes all open dropdown menus.
   *
   * @example
   * dropdown.closeAllDropdowns();
   */
  closeAllDropdowns() {
    if (!document.querySelector('.dropdown--open')) return;
    const openDropdowns = lib.qsa('.dropdown--open');
    for (const parent of openDropdowns) {
      this._close(parent);
    }
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
  
    await lib.removeClass(parent, 'dropdown--open', 200);
    parent.classList.remove('dropdown--right', 'dropdown--bottom');
  
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

    this._globalClickHandler = e => {
      if (e.target.closest('[x-dropdown-open]') || e.target.closest('[x-dropdown] .dropdown--stay')) return;
      if (!document.querySelector('.dropdown--open')) return;
      this.closeAllDropdowns();
    };
    document.addEventListener('click', this._globalClickHandler);
    Dropdown._globalListenersAttached = true;
  }

  /**
   * Full teardown: cleanup and remove global listener. Use on SPA unmount or Next.js.
   * SSR-safe: no-op when document is undefined.
   */
  destroy() {
    if (typeof document === 'undefined' || !this._initialized) return;
    this._cleanup();
    this._initialized = false;
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
