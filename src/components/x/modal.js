/**
 * @fileoverview Modal window management system.
 *
 * Handles modal initialization, open/close actions, stacking, global classes, and URL hash integration.
 * Supports unique modals, nested modals, ESC and overlay close, and custom events.
 *
 * Public API:
 *
 * - `modal.init()` – Initializes all modal components.
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
 * @version 0.2
 * @since 2025-07-17
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
  }

  /**
   * Initializes modal system.
   * Renders modal HTML, sets up open links, and global listeners.
   */
  init() {
    this._renderModalContents();
    this._setupModalLinks();
    this._setupGlobalListeners();
  }

  /**
   * Moves [x-modal] definitions into modal containers.
   * Creates modal structure and appends to `.modal-here` or `<body>`.
   * @private
   */
  _renderModalContents() {
    lib.qsa('[x-modal]').forEach(item => {
      let here = lib.qs('.modal-here'),
          placeholder = here ? here : lib.qs('body'),
          id = item.getAttribute('x-modal'),
          classes = item.getAttribute('class') || '',
          windowClasses = item.dataset.windowClass || '';

      placeholder.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="modal ${classes}">
          <div class="modal-overlay"></div>
          <div class="modal-outer">
            <div class="modal-inner">
              <div class="modal-window ${windowClasses}">
                ${item.innerHTML}
                <div class="modal-rail">
                  <a role="button" class="modal-close"></a>
                </div>
              </div>
            </div>
          </div>
        </div>
      `);

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
      let id = link.getAttribute('x-modal-open');

      link.addEventListener('click', e => {
        e.preventDefault();
        this.show(id);
      });

      // Auto-open if hash matches and modal has modal_hash
      if (window.location.hash == '#' + id) {
        let modal = lib.qs('#' + id);
        if (modal.classList.contains('modal_hash')) {
          this.show(id);
        }
      }
    });
  }

  /**
   * Sets up global listeners for closing modals.
   * Supports overlay click, close button, and ESC key.
   * @private
   */
  _setupGlobalListeners() {
    document.addEventListener('click', e => {
      let modalActive = lib.qs('.modal_active');
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
    });

    document.addEventListener('keydown', e => {
      let modalsActive = lib.qsa('.modal_active');
      let modalActive = modalsActive[modalsActive.length - 1];
      if (modalActive && e.key === 'Escape') {
        e.preventDefault();
        this.hide(modalActive.getAttribute('id'));
      }
    });
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

    let modal = lib.qs('#' + id);
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

    let modal = lib.qs('#' + id);
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
 * @type {Modal}
 */
export const modal = new Modal();
