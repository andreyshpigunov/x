//
//  modal.js / x
//  Modal windows
//
//  Created by Andrey Shpigunov at 12.04.2025
//  All rights reserved.
//
//  Usage:
//  <div x-modal="modal" class="[custom-classes]" data-window-class="[window-classes]">
//    <h1>Hello modal!</h1>
//    <p><a class="button modal-close">Close</a></p> — optional
//  </div>
//  <a x-modal-open="modal">Open modal</a>
//
//  <script>
//    let modal = qsa('#modal');
//    modal.addEventListener('modal:ready', event => { ... });
//    modal.addEventListener('modal:open', event => { ... });
//    modal.addEventListener('modal:close', event => { ... });
//  </script>
//

import { lib } from './lib';

class Modal {
  constructor() {
    // Z-index level counter for stacked modals
    this.modalLevel = 0;

    // Lock counter to avoid overlapping show/hide animations
    this.lockCount = 0;

    // Root document element (used to apply global classes)
    this.html = lib.qs('html');
  }

  /**
   * Initializes all modal components.
   * Renders modal HTML, binds modal-open links, and sets up global listeners.
   */
  init() {
    this._renderModalContents();
    this._setupModalLinks();
    this._setupGlobalListeners();
  }

  /**
   * Moves modal content from [x-modal] elements into modal containers inside the DOM.
   * Builds modal structure and appends it to .modal-here or <body>.
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

      item.remove(); // Remove the original [x-modal] definition
    });
  }

  /**
   * Sets up all [x-modal-open] links.
   * Attaches click handlers and optionally opens modal if matching hash in URL.
   */
  _setupModalLinks() {
    lib.qsa('[x-modal-open]').forEach(link => {
      let id = link.getAttribute('x-modal-open');

      // Open modal on click
      link.addEventListener('click', e => {
        e.preventDefault();
        this.show(id);
      });

      // Open modal on page load if URL hash matches and modal has modal_hash class
      if (window.location.hash == '#' + id) {
        let modal = lib.qs('#' + id);
        if (modal.classList.contains('modal_hash')) {
          this.show(id);
        }
      }
    });
  }

  /**
   * Sets up global document event listeners:
   * - Close modal on outside click or close button
   * - Close modal on ESC key
   */
  _setupGlobalListeners() {
    // Close on overlay click or .modal-close click
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

    // Close on ESC key
    document.addEventListener('keydown', e => {
      let modalsActive = lib.qsa('.modal_active');
      let modalActive = modalsActive[modalsActive.length - 1]; // topmost modal
      if (modalActive && e.key === 'Escape') {
        e.preventDefault();
        this.hide(modalActive.getAttribute('id'));
      }
    });
  }

  /**
   * Opens the modal with the given ID.
   * Handles stacking, URL hash, global class changes, and animations.
   * @param {string} id - The modal ID (from x-modal or x-modal-open)
   */
  async show(id) {
    if (this.lockCount > 0) return; // lock active

    if (this.isActive(id)) {
      this.hide(id);
      return;
    }

    let modal = lib.qs('#' + id);
    if (!modal) return;

    // If modal is marked as unique, close all others first
    if (modal.classList.contains('modal_uniq')) {
      await this.hideAll();
    }

    this.lockCount++;
    
    try {
      modal.dispatchEvent(new CustomEvent('modal:ready'));
  
      // Update URL hash if required
      if (modal.classList.contains('modal_hash')) {
        history.replaceState(null, '', '#' + id);
      }
  
      // Add global and specific modal active classes
      lib.addClass(this.html, 'modal_active');
      lib.addClass(this.html, id + '_active');
  
      // Highlight corresponding open link
      lib.addClass('[x-modal-open=' + id + ']', 'active');
  
      // Raise z-index level
      this.modalLevel++;
      lib.addClass(modal, 'modal_z' + this.modalLevel);
  
      // Activate modal with slight delay for transition
      await lib.addClass(modal, 'modal_active', 10);
  
      // Scroll modal to top
      lib.qs('.modal-outer', modal)?.scrollTo(0, 1);
  
      // Wait for open animation
      await new Promise(resolve => setTimeout(resolve, 200));
  
      modal.dispatchEvent(new CustomEvent('modal:open'));
      
    } finally {
      this.lockCount--;
    }
  }

  /**
   * Closes the modal with the given ID.
   * Handles transition, class cleanup, and z-index decrement.
   * @param {string} id - The modal ID to hide
   */
  async hide(id) {
    if (this.lockCount > 0) return;

    let modal = lib.qs('#' + id);
    if (!modal) return;

    this.lockCount++;

    // Clear hash if modal was opened via hash
    if (
      modal.classList.contains('modal_hash') &&
      window.location.hash === '#' + id
    ) {
      history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }

    // Remove active class from trigger button
    lib.removeClass('[x-modal-open=' + id + ']', 'active');

    // Remove active class from modal with transition
    await lib.removeClass(modal, 'modal_active', 200);

    // Remove z-index class
    lib.removeClass(modal, 'modal_z' + this.modalLevel);

    modal.dispatchEvent(new CustomEvent('modal:close'));

    // Remove global modal_active flags
    lib.removeClass(this.html, id + '_active');
    this.modalLevel--;
    if (this.modalLevel === 0) {
      lib.removeClass(this.html, 'modal_active');
    }

    this.lockCount--;
  }

  /**
   * Closes all currently open modals one by one.
   * Useful for unique modals or page-level transitions.
   */
  async hideAll() {
    const modals = lib.qsa('.modal_active');
    if (!modals.length) return;
    for (const modal of modals) {
      await this.hide(modal.getAttribute('id'));
    }
  }

  /**
   * Checks whether the modal with the given ID is currently active.
   * @param {string} id - Modal ID to check
   * @returns {boolean}
   */
  isActive(id) {
    return lib.qs('#' + id)?.classList.contains('modal_active') ?? false;
  }
}

export const modal = new Modal();
