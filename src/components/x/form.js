//
//	form.js
//	x
//
//	Created by Andrey Shpigunov on 11.09.2024.
//
//  Additional form elements functions
//
//  setChecked(element, checked = false) - set checkbox and radio as checked with dispatchEvent
//  setValue(element, value) - set input, textarea and select values with dispatchEvent
//  onUpdate(...args) - callback function after updating fields with setChecked, setValue and internal
//  update(element) - dispatch 'update' event manually
//


import { lib } from './lib';


class Form {
    
    constructor() {
        // Events
        this.change = new Event('change');
        this.input = new Event('input');
        // Object with added events
        this.listen = {
            update: []
        };
    }
    
    // Alternative to element.checked = bool with event callback
    setChecked(element, checked = false) {
        let el = lib.qs(element);
        el.checked = checked;
        el.dispatchEvent(this.input);
    }
    
    // Alternative to element.value = string with event callback
    setValue(element, value) {
        let el = lib.qs(element);
        let tagName = el.tagName.toLowerCase();
        switch (tagName) {
            case 'input':
            case 'textarea':
                el.value = value;
                el.dispatchEvent(this.input);
                break
            case 'select':
                el.value = value;
                el.dispatchEvent(this.change);
                break
            default:
                console.log('Error', 'Unsupported element: ' + tagName)
                break
        }
    }
    
    // Callback for events on elements
    // Supports input, textarea and select
    // Arguments: onUpdate([el1, el2, ..., elN], callback)
    onUpdate(elements, callback) {
        if (elements.length) {
            for (let element of elements) {
                let el = lib.qs(element);
                let uid = this._uid(el);
                let tagName = el.tagName.toLowerCase();
                switch (tagName) {
                    case 'input':
                    case 'textarea':
                        if (!this.listen.update.includes(uid)) {
                            el.addEventListener('input', callback);
                            this.listen.update.push(uid);
                        }
                        break
                    case 'select':
                        if (!this.listen.update.includes(uid)) {
                            el.addEventListener('change', callback);
                            this.listen.update.push(uid);
                        }
                        break
                    default:
                        console.log('Error', 'Unsupported element: ' + tagName)
                        break
                }
            }
        }
    }
    
    // Dispatch update event
    update(elements) {
        if (elements.length) {
            for (let element of elements) {
                let el = lib.qs(element);
                let tagName = el.tagName.toLowerCase();
                switch (tagName) {
                    case 'input':
                    case 'textarea':
                        el.dispatchEvent(this.input);
                        break
                    case 'select':
                        el.dispatchEvent(this.change);
                        break
                    default:
                        console.log('Error', 'Unsupported element: ' + tagName)
                        break
                }
            }
        }
    }
    
    _uid(element) {
        let el = lib.qs(element);
        return [el.id, el.name].join('-');
    }
    
}

export const form = new Form();
