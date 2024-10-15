//
//	modal.js
//	x
//
//	Created by Andrey Shpigunov on 18.09.2024.
//
//  Usage:
//  <a data-modal="modal">Open modal</a>
//
//  <div id="modal" class="modal-content [custom-classes]" data-window-class="[window-classes]">
//      <p>Hello modal!</p>
//      <p><a class="button modal-close">Close</a></p> — optional
//  </div>
//
//  <script>
//    let modal = document.getElementById('modal-test');
//    modal.addEventListener('modal:ready', event => { ... });
//    modal.addEventListener('modal:open', event => { ... });
//    modal.addEventListener('modal:close', event => { ... });
//  </script>
//


import { lib } from './lib';


class Modal {
    
    constructor() {
        // Modal level (z-index)
        this.modalLevel = 0;
        // Modal events
        this.eventReady = new CustomEvent('modal:ready');
        this.eventOpen  = new CustomEvent('modal:open');
        this.eventClose = new CustomEvent('modal:close');
        // Lock from collizions when show/hide
        this.lock = false;
    }
    
    // Init windows
    init() {
        
        // Modals content
        let content = lib.qsa('[x-modal]');
        if (content.length) {
            for (let item of content) {
                let here = lib.qs('.modal-here'),
                    placeholder = here ? here : lib.qs('body'),
                    
                    id = item.getAttribute('id'),
                    classes = item.getAttribute('class') || '',
                    windowClasses = item.dataset.windowClass || '',
                    content = item.innerHTML;
                
                placeholder.insertAdjacentHTML('beforeend', `
                    <div id="${id}" class="modal ${classes}">
                        <div class="modal-overlay"></div>
                        <div class="modal-outer">
                            <div class="modal-inner">
                                <div class="modal-window ${windowClasses}">
                                    ${content}
                                    <div class="modal-rail">
                                        <a role="button" class="modal-close"></a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `);
                item.remove();
            }
        }
        
        // Links on modals
        let links = lib.qsa('[x-modal-open]');
        if (links.length) {
            for (let link of links) {
                let id = link.getAttribute('x-modal-open');
                // Add event listener on link
                link.addEventListener('click', e => {
                    e.preventDefault();
                    this.show(id);
                });
                // Show modal if hash defined in URL
                if (window.location.hash == '#' + id) {
                    let modal = lib.qs('#' + id);
                    if (modal.classList.contains('modal_hash')) {
                        this.show(id);
                    }
                }
            }
        }
        
        // Hide modal on click outside
        document.addEventListener('click', e => {
            let modalActive = lib.qs('.modal.modal_active');
            if (
                modalActive &&
                e.target.matches('.modal.modal_active, .modal.modal_active *') &&
                (
                    e.target.classList.contains('modal-close') ||
                    !e.target.matches('.modal-window, .modal-window *')
                )
            ) {
                e.preventDefault();
                this.hide(e.target.closest('.modal').getAttribute('id'));
            }
        });
        
        // Listen ESC button press, when modal active
        document.addEventListener('keydown', e => {
            let modalsActive = lib.qsa('.modal_active');
            let modalActive = modalsActive[modalsActive.length - 1];
            if (modalActive && e.key == 'Escape') {
                e.preventDefault();
                this.hide(modalActive.getAttribute('id'));
            }
        });
    }
    
    // Show window
    async show(id) {
        if (this.isActive(id)) {
            this.hide(id);
            return false;
        }
        
        let modal = document.getElementById(id);
        if (!this.lock && modal) {
            
            if (modal.classList.contains('modal_uniq')) {
                this.hideAll();
            }
            
            this.lock = true;
            
            modal.dispatchEvent(this.eventReady);
            
            if (modal.classList.contains('modal_hash')) {
                window.location.hash = id;
            }
            
            let html = lib.qs('html');
            lib.addClass(html, 'modal_active');
            lib.addClass(html, id + '_active');
            
            let buttons = lib.qsa('[x-modal-open=' + id + ']');
            if (buttons) {
                for (let button of buttons) lib.addClass(button, 'active');
            }
            
            this.modalLevel++;
            lib.addClass(modal, 'modal_z' + this.modalLevel);
            await lib.addClass(modal, 'modal_active', 10);
            lib.qs('.modal-outer', modal).scrollTo(0,1);
            
            setTimeout(() => {
                modal.dispatchEvent(this.eventOpen);
                this.lock = false;
            }, 200);
        }
    }
    
    // Hide window
    async hide(id) {
        let modal = lib.qs('#' + id);
        if (modal && !this.lock) {
            this.lock = true;
            
            if (
                modal.classList.contains('modal_hash') &&
                window.location.hash == '#' + id
            ) {
                history.replaceState(null, document.title, window.location.href.split('#')[0])
            }
            
            await lib.removeClass(modal, 'modal_active', 200);
            lib.removeClass(modal, 'modal_z' + this.modalLevel);
            modal.dispatchEvent(this.eventClose);
            
            let html = lib.qs('html');
            lib.removeClass(html, id + '_active');
            this.modalLevel--;
            if (this.modalLevel == 0) {
                lib.removeClass(html, 'modal_active');
            }
            
            let buttons = lib.qsa('[x-modal-open=' + id + ']');
            if (buttons) {
                for (let button of buttons) lib.removeClass(button, 'active');
            }
            
            this.lock = false;
        }
    }
    
    // Hide all active modals
    hideAll() {
        let activeModals = lib.qsa('.modal_active');
        if (activeModals.length) {
            for (let item of activeModals) {
                this.hide(item.getAttribute('id'))
            }
        }
    }
    
    // Check modal activity
    isActive(id) {
        return lib.qs('#' + id + ' .modal_active')
    }
}

export const modal = new Modal();
