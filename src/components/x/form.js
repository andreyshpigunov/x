/**
 * @fileoverview Form utilities for managing form elements, values, and events.
 *
 * Provides methods for setting values, managing checkboxes/radios, attaching/removing event listeners,
 * and manually dispatching events. Supports inputs, textareas, selects, checkboxes, radios, and contenteditable elements.
 *
 * Exported singleton: `form`
 *
 * Usage:
 *
 * Basic value setting:
 *   import { form } from './form.js';
 *
 *   // Set input value
 *   form.setValue('#username', 'john_doe');
 *
 *   // Set textarea value
 *   form.setValue('textarea.message', 'Hello world');
 *
 *   // Set select value
 *   form.setValue('select.country', 'US');
 *
 *   // Set contenteditable element
 *   form.setValue('[contenteditable]', 'Editable content');
 *
 * Checkbox and radio management:
 *   // Check a checkbox
 *   form.setChecked('#agree', true);
 *
 *   // Uncheck a checkbox
 *   form.setChecked('#newsletter', false);
 *
 *   // Select a radio button
 *   form.setChecked('input[name="gender"][value="male"]', true);
 *
 * Event listeners:
 *   // Attach listener for input/change events
 *   form.onUpdate('input[name="email"]', (element) => {
 *     console.log('Email changed:', element.value);
 *   });
 *
 *   // Attach listener to multiple elements
 *   form.onUpdate('input, textarea, select', (element) => {
 *     console.log('Form field updated:', element.name, element.value);
 *   });
 *
 * Manual event triggering:
 *   // Manually trigger input/change event
 *   form.update('#username');
 *
 *   // Trigger events on all form fields
 *   form.update('form input, form select, form textarea');
 *
 * Removing listeners:
 *   form.offUpdate('input[name="email"]');
 *   // Or remove all: form.destroy();
 *
 * Public API:
 *
 * @method setValue(selector, value) - Sets value of form elements or contenteditable.
 *   @param {string} selector - CSS selector for elements.
 *   @param {string|boolean|number} value - Value to set.
 *   @throws {Error} If element type is unsupported.
 *   @example
 *     form.setValue('#email', 'user@example.com');
 *     form.setValue('textarea', 'Text content');
 *
 * @method setChecked(selector, checked) - Sets checked state of checkboxes/radios.
 *   @param {string} selector - CSS selector for checkboxes or radios.
 *   @param {boolean} [checked=false] - Desired checked state.
 *   @example
 *     form.setChecked('#agree', true);
 *     form.setChecked('input[type="radio"]', false);
 *
 * @method onUpdate(selector, callback) - Attaches listener for input/change events.
 *   Prevents duplicate listeners on the same element.
 *   @param {string} selector - CSS selector for elements.
 *   @param {Function} callback - Function to call when input or change event fires.
 *     Callback receives the element as parameter: callback(element)
 *   @example
 *     form.onUpdate('input', (el) => console.log(el.value));
 *
 * @method offUpdate(selector) - Removes update listeners from elements (and internal tracking).
 *   @param {string} selector - CSS selector for elements.
 *   @example
 *     form.offUpdate('input[name="email"]');
 *
 * @method destroy() - Removes all update listeners and clears internal state. Use on SPA unmount / Next.js.
 *
 * @method update(selector) - Manually dispatches input/change events.
 *   @param {string} selector - CSS selector for elements.
 *   @example
 *     form.update('#username');
 *
 * @method getEventType(element) - Determines appropriate event type for an element.
 *   @param {HTMLElement} element - Target element.
 *   @returns {string} 'input' or 'change' depending on element type.
 *   @throws {Error} If element is unsupported.
 *   @example
 *     const eventType = form.getEventType(document.querySelector('input'));
 *     // Returns: 'input'
 *
 * Supported element types:
 *
 * - Input elements (text, email, password, number, etc.)
 * - Textarea elements
 * - Select elements
 * - Checkbox inputs
 * - Radio inputs
 * - Contenteditable elements
 *
 * Event types:
 *
 * - Input elements and contenteditable: 'input' event
 * - Select elements: 'change' event
 *
 * Next.js: call destroy() in useEffect cleanup (e.g. on unmount). All DOM methods no-op when document is undefined.
 *
 * @example
 * // Next.js — cleanup on unmount
 * useEffect(() => {
 *   form.onUpdate('input[name="email"]', (el) => setEmail(el.value));
 *   return () => form.destroy();
 * }, []);
 *
 * @author Andrey Shpigunov
 * @version 0.3
 * @since 2026-02-02
 */

import { lib } from './lib';

class Form {
  /**
   * Creates a Form utility instance.
   * Stores internal references to event listeners and handlers for removal.
   */
  constructor() {
    /**
     * Elements that have an update listener (duplicate check + public listen.update).
     * @type {Set<HTMLElement>}
     * @private
     */
    this._updateElements = new Set();

    /**
     * Stored handlers per element so offUpdate/destroy can remove listeners.
     * @type {Map<HTMLElement, { eventType: string, handler: function }>}
     * @private
     */
    this._updateHandlers = new Map();

    /** @readonly */
    this.listen = Object.freeze({ update: this._updateElements });
  }

  /**
   * Determines the appropriate event type for an element.
   *
   * @param {HTMLElement} el - Target element.
   * @returns {string} 'input' or 'change' depending on the element type.
   * @throws {Error} If the element is unsupported.
   */
  getEventType(el) {
    if (!el) throw new Error('getEventType: Element is required');
    if (el.isContentEditable) return 'input';
    const tag = el.tagName?.toLowerCase();
    if (!tag) throw new Error('getEventType: Element has no tagName');
    if (tag === 'input' || tag === 'textarea') return 'input';
    if (tag === 'select') return 'change';
    throw new Error(`getEventType: Unsupported element <${tag}>`);
  }

  /**
   * Resolves event type for an element without throwing (for internal use).
   * @param {HTMLElement} el
   * @returns {string} 'input' | 'change' | ''
   * @private
   */
  _eventType(el) {
    if (!el) return '';
    if (el.isContentEditable) return 'input';
    const tag = el.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return 'input';
    if (tag === 'select') return 'change';
    return '';
  }

  /**
   * Sets the checked state of checkboxes or radios and dispatches 'input' event if changed.
   *
   * @param {string} selector - CSS selector for checkboxes or radios.
   * @param {boolean} [checked=false] - Desired checked state.
   */
  setChecked(selector, checked = false) {
    if (typeof document === 'undefined' || !selector) return;

    const els = lib.qsa(selector);
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const type = el.type;
      if (type !== 'checkbox' && type !== 'radio') continue;
      if (el.checked === checked) continue;
      el.checked = checked;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  /**
   * Sets the value of inputs, textareas, selects, or contenteditable elements and dispatches event.
   *
   * @param {string} selector - CSS selector for elements.
   * @param {string|boolean|number} value - Value to set.
   * @throws {Error} If element type is unsupported.
   */
  setValue(selector, value) {
    if (typeof document === 'undefined' || !selector) return;

    const els = lib.qsa(selector);
    const strVal = String(value);
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      let eventType = '';
      try {
        if (el.isContentEditable) {
          el.innerText = strVal;
          eventType = 'input';
        } else {
          const tag = el.tagName?.toLowerCase();
          if (!tag) continue;
          const type = el.type;
          if (tag === 'input') {
            if (type === 'checkbox' || type === 'radio') {
              el.checked = !!value;
            } else {
              el.value = strVal;
            }
            eventType = 'input';
          } else if (tag === 'textarea' || tag === 'select') {
            el.value = strVal;
            eventType = tag === 'select' ? 'change' : 'input';
          } else {
            continue;
          }
        }
        if (eventType) el.dispatchEvent(new Event(eventType, { bubbles: true }));
      } catch (err) {
        if (typeof console !== 'undefined' && console.error) console.error('setValue', el, err);
      }
    }
  }

  /**
   * Attaches input/change listeners to elements, preventing duplicates.
   *
   * @param {string} selector - CSS selector for elements.
   * @param {Function} callback - Function to call when input or change event fires.
   */
  onUpdate(selector, callback) {
    if (typeof document === 'undefined' || !selector || typeof callback !== 'function') return;

    const els = lib.qsa(selector);
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (this._updateHandlers.has(el)) continue;

      const eventType = this._eventType(el);
      if (!eventType) continue;

      const handler = () => callback(el);
      el.addEventListener(eventType, handler);
      this._updateHandlers.set(el, { eventType, handler });
      this._updateElements.add(el);
    }
  }

  /**
   * Removes update listeners from elements matching the selector.
   *
   * @param {string} selector - CSS selector for elements.
   */
  offUpdate(selector) {
    if (typeof document === 'undefined' || !selector) return;

    const els = lib.qsa(selector);
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const stored = this._updateHandlers.get(el);
      if (!stored) continue;
      el.removeEventListener(stored.eventType, stored.handler);
      this._updateHandlers.delete(el);
      this._updateElements.delete(el);
    }
  }

  /**
   * Manually dispatches 'input' or 'change' events on the selected elements.
   *
   * @param {string} selector - CSS selector for elements.
   */
  update(selector) {
    if (typeof document === 'undefined' || !selector) return;

    const els = lib.qsa(selector);
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const eventType = this._eventType(el);
      if (eventType) el.dispatchEvent(new Event(eventType, { bubbles: true }));
    }
  }

  /**
   * Removes all update listeners and clears internal state. Use on SPA unmount or in Next.js cleanup.
   * SSR-safe: no-op when document is undefined.
   */
  destroy() {
    if (typeof document === 'undefined') return;
    this._updateHandlers.forEach((stored, el) => {
      el.removeEventListener(stored.eventType, stored.handler);
    });
    this._updateHandlers.clear();
    this._updateElements.clear();
  }
}

/**
 * Singleton export of the Form utility.
 * @type {Form}
 */
export const form = new Form();
