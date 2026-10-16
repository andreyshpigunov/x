/**
 * @fileoverview Modal window management system with stacking, animations, and URL hash support.
 *
 * Handles modal initialization, open/close actions, stacking (z-index management), global classes,
 * and URL hash integration. Supports unique modals, nested modals, ESC and overlay close, and custom events.
 *
 * Exported singleton: `modal`
 *
 * Usage:
 *
 * Basic setup:
 *   import { modal } from './modal.js';
 *   modal.init();
 *
 * HTML structure:
 *   <div x-modal="myModal" class="modal_hash" data-window-class="max800">
 *     <h2>Modal Title</h2>
 *     <p>Modal content goes here</p>
 *     <button class="modal-close">Close</button>
 *   </div>
 *
 *   <a href="#myModal" x-modal-open="myModal">Open Modal</a>
 *
 * Open/close programmatically:
 *   modal.show('myModal');
 *   modal.hide('myModal');
 *   modal.hideAll();
 *
 * Check if modal is active:
 *   if (modal.isActive('myModal')) {
 *     console.log('Modal is open');
 *   }
 *
 * Event listeners:
 *   const modalElement = document.querySelector('#myModal');
 *   modalElement.addEventListener('modal:ready', () => {
 *     console.log('Modal is ready');
 *   });
 *   modalElement.addEventListener('modal:open', () => {
 *     console.log('Modal opened');
 *   });
 *   modalElement.addEventListener('modal:close', () => {
 *     console.log('Modal closed');
 *   });
 *
 * Public API:
 *
 * @method init() - Initializes all modal components.
 *   Moves [x-modal] elements into modal containers, sets up [x-modal-open] links,
 *   and attaches global event listeners. Safe to call multiple times.
 *   @example
 *     modal.init();
 *
 * @method destroy() - Removes all modal-related event listeners and resets state.
 *   Safe to call multiple times.
 *   @example
 *     modal.destroy();
 *
 * @method show(id) - Opens modal by ID.
 *   Handles stacking, URL hash, and custom events. Returns Promise.
 *   @param {string} id - Modal ID
 *   @returns {Promise<void>}
 *   @example
 *     await modal.show('myModal');
 *
 * @method hide(id) - Closes modal by ID.
 *   Handles transitions, z-index cleanup, and custom events. Returns Promise.
 *   @param {string} id - Modal ID
 *   @returns {Promise<void>}
 *   @example
 *     await modal.hide('myModal');
 *
 * @method hideAll() - Closes all active modals.
 *   Useful for unique modals or global cleanup. Returns Promise.
 *   @returns {Promise<void>}
 *   @example
 *     await modal.hideAll();
 *
 * @method isActive(id) - Checks if modal is currently active.
 *   @param {string} id - Modal ID
 *   @returns {boolean}
 *   @example
 *     if (modal.isActive('myModal')) { ... }
 *
 * Custom Events:
 *
 * - `modal:ready` - Fired after modal is prepared but before shown
 * - `modal:open` - Fired after modal open transition completes
 * - `modal:close` - Fired after modal close transition completes
 *
 * Modal classes and attributes:
 *
 * - `x-modal="id"` - Required attribute to define modal
 * - `x-modal-open="id"` - Attribute for links/buttons that open modal
 * - `modal_hash` - Class to enable URL hash integration (#id)
 * - `modal_uniq` - Class to close other modals when this one opens
 * - `data-window-class` - Attribute to add classes to modal window
 *
 * Features:
 *
 * - Automatic z-index stacking for nested modals
 * - ESC key to close topmost modal
 * - Click overlay to close
 * - Click .modal-close button to close
 * - URL hash integration (modal_hash class)
 * - Unique modal mode (modal_uniq class)
 * - Lock mechanism to prevent overlapping animations
 * - Global classes on <html> element
 *
 * SECURITY WARNINGS:
 *
 * 1. innerHTML in _renderModalContents():
 *    - Modal content is inserted via innerHTML
 *    - Only use trusted content in [x-modal] elements
 *    - Sanitize user-generated content before rendering
 *
 * 2. ID validation:
 *    - Modal IDs are used in selectors and URL hash
 *    - Validate IDs to prevent XSS through selectors
 *    - IDs should only contain alphanumeric characters, hyphens, underscores
 *
 * 3. URL hash manipulation:
 *    - history.replaceState is used with modal ID
 *    - Ensure IDs are safe for URL usage
 *
 * Best practices:
 *
 * - Always validate modal IDs before calling show/hide
 * - Sanitize content before placing in [x-modal] elements
 * - Use Content Security Policy (CSP) headers
 * - Test modal behavior with nested modals
 * - Handle errors in event listeners gracefully
 *
 * SSR-safe: init/destroy and DOM methods no-op when document/window is undefined.
 *
 * @example
 * // Vanilla JS — plain HTML
 * // index.html:
 * // <div x-modal="myModal" class="modal_hash" data-window-class="max800">
 * //   <h2>Title</h2>
 * //   <p>Content</p>
 * //   <button type="button" class="modal-close">Close</button>
 * // </div>
 * // <a href="#myModal" x-modal-open="myModal">Open</a>
 * //
 * // <script type="module">
 * //   import { modal } from './src/components/x/modal.js';
 * //   window.addEventListener('DOMContentLoaded', () => modal.init());
 * //   window.addEventListener('pagehide', () => modal.destroy());
 * // </script>
 *
 * @author Andrey Shpigunov
 * @version 0.3
 * @since 2025-07-18
 */

import { lib } from './lib.js';
import { createLifecycle } from './lifecycle.js';

/**
 * Modal window controller.
 */
class Modal {
  /**
   * Creates a Modal instance.
   */
  constructor() {
    this.modalLevel = 0;
    this._scope = createLifecycle();
    this._touched = new Set();
    this._opened = new Map();
    this.lockCount = 0;
    /** @type {HTMLElement|null} */
    this.html = null;
    /** @type {boolean} @private */
    this._initialized = false;
    /** @type {function(Event): void | null} @private */
    this._clickHandler = null;
    /** @type {function(Event): void | null} @private */
    this._keydownHandler = null;
    /** @type {Map<HTMLElement, function(Event): void>} @private */
    this._linkHandlers = new Map();
  }

  /**
   * Initializes the modal system. SSR-safe: no-op when document/window undefined.
   * Safe to call multiple times; destroys previous listeners first.
   */
  init() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    this.destroy();

    this._scope = createLifecycle();
    this.html = lib.qs('html');
    this._renderModalContents();
    this._setupModalLinks();
    this._setupGlobalListeners();
    this._initialized = true;
  }

  /**
   * Destroys modal system. SSR-safe: no-op when window undefined.
   * Safe to call multiple times.
   */
  destroy() {
    this._scope.dispose();
    for (const modal of this._touched) {
      modal.classList.remove('modal_active', 'modal_ready');
      for (const cls of (modal.getAttribute('class') || '').split(/\s+/)) {
        if (/^modal_z\d+$/.test(cls)) modal.classList.remove(cls);
      }
      this.html?.classList.remove(modal.id + '_active');
      lib.removeClass('[x-modal-open="' + modal.id + '"]', 'active');
    }
    this.html?.classList.remove('modal_active');
    this._touched.clear();
    this._opened.clear();
    if (typeof document === 'undefined') return;
    if (this._clickHandler) {
      document.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }
    this._linkHandlers.forEach((handler, link) => {
      link.removeEventListener('click', handler);
      link.classList.remove('active');
    });
    this._linkHandlers.clear();
    this.modalLevel = 0;
    this.lockCount = 0;
    this.html = null;
    this._initialized = false;
  }

  /**
   * Validates modal ID to prevent XSS attacks.
   * Only allows alphanumeric characters, hyphens, and underscores.
   * @param {string} id - Modal ID to validate
   * @returns {boolean} - True if valid
   * @private
   */
  _isValidId(id) {
    if (typeof id !== 'string' || !id) return false;
    return /^[a-zA-Z0-9_-]+$/.test(id);
  }

  /**
   * Escapes HTML for safe attribute use. SSR-safe: uses string replace when document undefined.
   * @param {string} text
   * @returns {string}
   * @private
   */
  _escapeHtml(text) {
    return lib._escapeHtml(text);
  }

  /**
   * Moves [x-modal] definitions into modal containers.
   * Creates modal structure and appends to `.modal-here` or `<body>`.
   * SECURITY: Validates IDs and escapes window classes to prevent XSS.
   * @private
   */
  _renderModalContents() {
    const items = lib.qsa('[x-modal]');
    const placeholder = lib.qs('.modal-here') || lib.qs('body');
    if (!placeholder) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const id = item.getAttribute('x-modal');
      if (!id || !this._isValidId(id)) continue;
      if (lib.qs('#' + CSS.escape(id))) continue;

      const classes = item.getAttribute('class') || '';
      const windowClasses = (item.getAttribute('data-window-class') || '').replace(/\s+/g, ' ').trim();
      const safeWindowClasses = this._escapeHtml(windowClasses);
      const html = item.innerHTML;

      const modal = document.createElement('div');
      modal.id = id;
      modal.className = 'modal ' + classes;
      modal.innerHTML = '<div class="modal-overlay"></div><div class="modal-outer"><div class="modal-inner"><div class="modal-window ' + safeWindowClasses + '">' + html + '<div class="modal-rail"><a role="button" class="modal-close"></a></div></div></div></div>';
      placeholder.appendChild(modal);
      item.remove();
    }
  }

  /**
   * Sets up all `[x-modal-open]` links.
   * Opens modal on click and handles hash-based auto-open.
   * SECURITY: Validates IDs before use.
   * @private
   */
  _setupModalLinks() {
    const links = lib.qsa('[x-modal-open]');
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const id = link.getAttribute('x-modal-open');
      if (!id || !this._isValidId(id)) continue;

      const handler = e => {
        e.preventDefault();
        this.show(id);
      };
      link.addEventListener('click', handler);
      this._linkHandlers.set(link, handler);

      if (window.location.hash === '#' + id) {
        const el = lib.qs('#' + CSS.escape(id));
        if (el && el.classList.contains('modal_hash')) this.show(id);
      }
    }
  }

  /**
   * Sets up global listeners for closing modals.
   * Supports overlay click, close button, and ESC key.
   * Saves handler references for safe removal.
   * @private
   */
  _setupGlobalListeners() {
    this._clickHandler = e => {
      const target = e.target;
      if (!(target instanceof Element)) return;
    
      // Обрабатываем только клики внутри активной модалки.
      // Ссылки и кнопки остальной страницы не перехватываем.
      const modal = target.closest('.modal');
      if (!modal || !modal.classList.contains('modal_active')) return;
    
      const isClose = Boolean(target.closest('.modal-close'));
      const isOutsideWindow = !target.closest('.modal-window');
    
      if (!isClose && !isOutsideWindow) return;
    
      e.preventDefault();
    
      const id = modal.getAttribute('id');
      if (id && this._isValidId(id)) this.hide(id);
    };

    this._keydownHandler = e => {
      if (e.key !== 'Escape') return;
      const modals = [...this._opened.keys()];
      const len = modals.length;
      if (!len) return;
      const id = modals[len - 1].getAttribute('id');
      if (id && this._isValidId(id)) {
        e.preventDefault();
        this.hide(id);
      }
    };

    document.addEventListener('click', this._clickHandler);
    document.addEventListener('keydown', this._keydownHandler);
  }

  /**
   * Opens modal by ID.
   * Handles stacking, URL hash, and custom events.
   * SECURITY: Validates ID before use.
   *
   * @param {string} id - Modal ID.
   * @returns {Promise<void>}
   */
  async show(id) {
    if (typeof document === 'undefined' || !this._isValidId(id)) return;
    if (this.lockCount > 0) return;
    if (this.isActive(id)) { await this.hide(id); return; }
    const modal = lib.qs('#' + CSS.escape(id));
    if (!modal) return;
    if (!this._scope.active) this._scope = createLifecycle();
    const scope = this._scope;
    if (modal.classList.contains('modal_uniq')) await this.hideAll();
    if (!scope.active || this.lockCount > 0) return;
    this.html ||= lib.qs('html');
    this._touched.add(modal);
    this.lockCount++;
    let released = false;
    try {
      modal.classList.add('modal_ready');
      if (!await scope.wait(10) || !scope.active) return;
      modal.dispatchEvent(new CustomEvent('modal:ready'));
      if (!scope.active) return;
      if (modal.classList.contains('modal_hash')) history.replaceState(null, '', '#' + id);
      this.html?.classList.add('modal_active', id + '_active');
      lib.addClass('[x-modal-open="' + id + '"]', 'active');
      this._opened.set(modal, this._opened.size + 1);
      this.modalLevel = this._opened.size;
      modal.classList.add('modal_z' + this.modalLevel, 'modal_active');
      lib.qs('.modal-outer', modal)?.scrollTo(0, 1);
      if (!await scope.wait(200) || !scope.active) return;
      this.lockCount--;
      released = true;
      modal.dispatchEvent(new CustomEvent('modal:open'));
    } finally {
      if (scope.active && !released) this.lockCount--;
    }
  }

  /**
   * Closes modal by ID.
   * Handles transitions, z-index cleanup, and custom events.
   * SECURITY: Validates ID before use.
   *
   * @param {string} id - Modal ID.
   * @returns {Promise<void>}
   */
  async hide(id) {
    if (typeof document === 'undefined' || !this._isValidId(id) || this.lockCount > 0) return;
    const modal = lib.qs('#' + CSS.escape(id));
    if (!modal?.classList.contains('modal_active')) return;
    if (!this._scope.active) this._scope = createLifecycle();
    const scope = this._scope;
    this._touched.add(modal);
    this.lockCount++;
    let released = false;
    try {
      if (modal.classList.contains('modal_hash') && window.location.hash === '#' + id) {
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      }
      lib.removeClass('[x-modal-open="' + id + '"]', 'active');
      modal.classList.remove('modal_active');
      if (!await scope.wait(200) || !scope.active) return;
      modal.classList.remove('modal_ready', 'modal_z' + this._opened.get(modal));
      this._opened.delete(modal);
      this._touched.delete(modal);
      let level = 0;
      for (const [other, previous] of this._opened) {
        other.classList.remove('modal_z' + previous);
        other.classList.add('modal_z' + (++level));
        this._opened.set(other, level);
      }
      this.modalLevel = level;
      this.html?.classList.remove(id + '_active');
      if (!level) this.html?.classList.remove('modal_active');
      this.lockCount--;
      released = true;
      modal.dispatchEvent(new CustomEvent('modal:close'));
    } finally {
      if (scope.active && !released) this.lockCount--;
    }
  }

  /**
   * Closes all active modals.
   * Useful for unique modals or global cleanup.
   *
   * @returns {Promise<void>}
   */
  async hideAll() {
    if (typeof document === 'undefined') return;
    const scope = this._scope;
    const modals = lib.qsa('.modal_active');
    for (let i = 0; i < modals.length; i++) {
      if (!scope.active) return;
      const id = modals[i].getAttribute('id');
      if (id) await this.hide(id);
    }
  }

  /**
   * Checks if modal is currently active. SSR-safe: returns false when document undefined.
   * @param {string} id
   * @returns {boolean}
   */
  isActive(id) {
    if (typeof document === 'undefined' || !id || typeof id !== 'string' || !this._isValidId(id)) return false;
    const modal = lib.qs('#' + CSS.escape(id));
    return modal ? modal.classList.contains('modal_active') : false;
  }
}

/**
 * Singleton export of Modal.
 * Use `modal.init()` to initialize or reinitialize safely.
 *
 * @type {Modal}
 */
export const modal = new Modal();
