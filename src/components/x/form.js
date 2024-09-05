//
//  form.js
//  Additional form elements functions
//
//  Created by Andrey Shpigunov on 30.08.2024.
//
//
//  setChecked — set checkbox and radio as checked with dispatchEvent
//  setValue — set input, textarea and select values with dispatchEvent
//  onUpdate — callback function after updating fields with setChecked, setValue and internal
//


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
        let el = this._el(element);
        el.checked = checked;
        el.dispatchEvent(this.input);
    }
    
    // Alternative to element.value = string with event callback
    setValue(element, value) {
        let el = this._el(element);
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
    // Arguments: onUpdate(el1, el2, ..., elN, callback)
    onUpdate(...args) {
        let callback = args.at(-1);
        for (let i = 0; i < args.length - 1; i++) {
            let el = this._el(args[i]);
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
    
    // Dispatch update event
    update(element) {
        let el = this._el(element);
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
    
    _uid(element) {
        let el = this._el(element);
        return [el.id, el.name].join('-');
    }
    
    _el(element) {
       return typeof element == 'string' ? qs(element) : element;
    }
}

export const form = new Form();
