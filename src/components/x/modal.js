/**
 * @fileoverview Modal window management system.
 *
 * Handles modal initialization, open/close actions, stacking, global classes, and URL hash integration.
 * Supports unique modals, nested modals, ESC and overlay close, and custom events.
 *
 * Public API:
 *
 * - `modal.init()` – Initializes all modal components. Safe for multiple calls.
 * - `modal.destroy()` – Removes all modal-related event listeners and resets state.
 * - `modal.show(id)` – Opens modal by ID.
 * - `modal.hide(id)` – Closes modal by ID.
 * - `modal.hideAll()` – Closes all active modals.
 * - `modal.isActive(id)` – Checks if modal is currently active.
 *
 * Custom Events:
 *
 * - `modal:ready` – Fired after modal is prepared but before shown.
 * - `modal:open` – Fired after modal open transition.
 * - `modal:close` – Fired after modal close transition.
 *
 * Example usage:
 *
 *   <div x-modal="modal" class="[custom-classes]" data-window-class="[window-classes]">
 *     <h1>Hello modal!</h1>
 *     <p><a class="button modal-close">Close</a></p> — optional
 *   </div>
 *   <a x-modal-open="modal">Open modal</a>
 *
 *   <script>
 *     modal.init();
 *     modal.show('modal');
 *   </script>
 *
 *   <script>
 *     let modal = qsa('#modal');
 *     modal.addEventListener('modal:ready', event => { ... });
 *     modal.addEventListener('modal:open', event => { ... });
 *     modal.addEventListener('modal:close', event => { ... });
 *   </script>
 *
 *   const m = document.querySelector('#modal');
 *   m.addEventListener('modal:open', () => console.log('Opened'));
 *   modal.show('modal');
 *
 * @author Andrey Shpigunov
 * @version 0.3
 * @since 2025-07-18
 */

import { lib } from './lib';

/**
 * Modal window controller.
 */
class Modal {
  /**
   * Creates a Modal instance.
   */
  constructor() {
    /**
     * Z-index level counter for stacked modals.
     * @type {number}
     */
    this.modalLevel = 0;

    /**
     * Lock counter to prevent overlapping animations.
     * @type {number}
     */
    this.lockCount = 0;

    /**
     * Root document element.
     * @type {HTMLElement}
     */
    this.html = lib.qs('html');

    /**
     * Initialization flag to control safe reinitialization.
     * @type {boolean}
     * @private
     */
    this._initialized = false;

    /**
     * Click event handler reference for removeEventListener.
     * @type {Function|null}
     * @private
     */
    this._clickHandler = null;

    /**
     * Keydown event handler reference for removeEventListener.
     * @type {Function|null}
     * @private
     */
    this._keydownHandler = null;
  }

  /**
   * Initializes the modal system.
   * Moves `[x-modal]` into `.modal-here` or `<body>`, sets up `[x-modal-open]` links, and global listeners.
   *
   * Safe to call multiple times. If already initialized, automatically destroys previous listeners.
   */
  init() {
    if (this._initialized) {
      this.destroy();
    }

    this._renderModalContents();
    this._setupModalLinks();
    this._setupGlobalListeners();

    this._initialized = true;
  }

  /**
   * Destroys modal system.
   * Removes event listeners and resets internal state.
   * Safe to call multiple times.
   */
  destroy() {
    if (this._clickHandler) {
      document.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }

    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }

    this.modalLevel = 0;
    this.lockCount = 0;
    this._initialized = false;
  }

  /**
   * Moves [x-modal] definitions into modal containers.
   * Creates modal structure and appends to `.modal-here` or `<body>`.
   * @private
   */
  _renderModalContents() {
    lib.qsa('[x-modal]').forEach(item => {
      const here = lib.qs('.modal-here');
      const placeholder = here ? here : lib.qs('body');
      const id = item.getAttribute('x-modal');
      const classes = item.getAttribute('class') || '';
      const windowClasses = (item.dataset.windowClass || '').replace(/\s+/g, ' ').trim();
      const html = item.innerHTML;
      
      const modal = document.createElement('div');
      modal.id = id;
      modal.className = `modal ${classes}`;
      modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-outer">
          <div class="modal-inner">
            <div class="modal-window ${windowClasses}">
              ${html}
              <div class="modal-rail">
                <a role="button" class="modal-close"></a>
              </div>
            </div>
          </div>
        </div>
      `;
      
      placeholder.appendChild(modal);
      item.remove();
    });
  }

  /**
   * Sets up all `[x-modal-open]` links.
   * Opens modal on click and handles hash-based auto-open.
   * @private
   */
  _setupModalLinks() {
    lib.qsa('[x-modal-open]').forEach(link => {
      const id = link.getAttribute('x-modal-open');

      link.addEventListener('click', e => {
        e.preventDefault();
        this.show(id);
      });

      // Auto-open if hash matches and modal has modal_hash
      if (window.location.hash === '#' + id) {
        const modal = lib.qs('#' + id);
        if (modal.classList.contains('modal_hash')) {
          this.show(id);
        }
      }
    });
  }

  /**
   * Sets up global listeners for closing modals.
   * Supports overlay click, close button, and ESC key.
   * Saves handler references for safe removal.
   * @private
   */
  _setupGlobalListeners() {
    this._clickHandler = e => {
      const modalActive = lib.qs('.modal_active');
      if (
        modalActive &&
        (
          e.target.classList.contains('modal-close') ||
          !e.target.closest('.modal-window')
        )
      ) {
        e.preventDefault();
        this.hide(e.target.closest('.modal')?.getAttribute('id'));
      }
    };

    this._keydownHandler = e => {
      const modalsActive = lib.qsa('.modal_active');
      const modalActive = modalsActive[modalsActive.length - 1];
      if (modalActive && e.key === 'Escape') {
        e.preventDefault();
        this.hide(modalActive.getAttribute('id'));
      }
    };

    document.addEventListener('click', this._clickHandler);
    document.addEventListener('keydown', this._keydownHandler);
  }

  /**
   * Opens modal by ID.
   * Handles stacking, URL hash, and custom events.
   *
   * @param {string} id - Modal ID.
   * @returns {Promise<void>}
   */
  async show(id) {
    if (this.lockCount > 0) return;

    if (this.isActive(id)) {
      this.hide(id);
      return;
    }

    const modal = lib.qs('#' + id);
    if (!modal) return;

    if (modal.classList.contains('modal_uniq')) {
      await this.hideAll();
    }

    this.lockCount++;

    try {
      await lib.addClass(modal, 'modal_ready');
      await lib.sleep(10);

      modal.dispatchEvent(new CustomEvent('modal:ready'));

      if (modal.classList.contains('modal_hash')) {
        history.replaceState(null, '', '#' + id);
      }

      lib.addClass(this.html, 'modal_active');
      lib.addClass(this.html, id + '_active');
      lib.addClass('[x-modal-open=' + id + ']', 'active');

      this.modalLevel++;
      lib.addClass(modal, 'modal_z' + this.modalLevel);

      await lib.addClass(modal, 'modal_active');

      lib.qs('.modal-outer', modal)?.scrollTo(0, 1);

      await lib.sleep(200);

      modal.dispatchEvent(new CustomEvent('modal:open'));

    } finally {
      this.lockCount--;
    }
  }

  /**
   * Closes modal by ID.
   * Handles transitions, z-index cleanup, and custom events.
   *
   * @param {string} id - Modal ID.
   * @returns {Promise<void>}
   */
  async hide(id) {
    if (this.lockCount > 0) return;

    const modal = lib.qs('#' + id);
    if (!modal) return;

    this.lockCount++;

    if (
      modal.classList.contains('modal_hash') &&
      window.location.hash === '#' + id
    ) {
      history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }

    lib.removeClass('[x-modal-open=' + id + ']', 'active');

    await lib.removeClass(modal, 'modal_active', 200);
    lib.removeClass(modal, 'modal_z' + this.modalLevel);

    modal.dispatchEvent(new CustomEvent('modal:close'));

    lib.removeClass(this.html, id + '_active');

    this.modalLevel--;
    if (this.modalLevel === 0) {
      lib.removeClass(this.html, 'modal_active');
    }

    this.lockCount--;
  }

  /**
   * Closes all active modals.
   * Useful for unique modals or global cleanup.
   *
   * @returns {Promise<void>}
   */
  async hideAll() {
    const modals = lib.qsa('.modal_active');
    if (!modals.length) return;
    for (const modal of modals) {
      await this.hide(modal.getAttribute('id'));
    }
  }

  /**
   * Checks if modal is currently active.
   *
   * @param {string} id - Modal ID.
   * @returns {boolean}
   */
  isActive(id) {
    return lib.qs('#' + id)?.classList.contains('modal_active') ?? false;
  }
}

/**
 * Singleton export of Modal.
 * Use `modal.init()` to initialize or reinitialize safely.
 *
 * @type {Modal}
 */
export const modal = new Modal();
