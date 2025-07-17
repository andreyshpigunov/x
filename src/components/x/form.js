/**
 * @fileoverview Additional form utilities for inputs, checkboxes, selects, and contenteditable elements.
 *
 * Provides methods for setting values, managing checkboxes, attaching/removing event listeners,
 * and manually dispatching events.
 *
 * Exported singleton: `form`
 *
 * Public API:
 *
 * - `form.setChecked(selector, checked)` – Set checked state of checkboxes/radios.
 * - `form.setValue(selector, value)` – Set value of form elements or contenteditable.
 * - `form.onUpdate(selector, callback)` – Attach listener for input/change events.
 * - `form.offUpdate(selector)` – Remove previously added listeners (partial, due to anonymous functions).
 * - `form.update(selector)` – Manually dispatch input/change event.
 *
 * Example usage:
 *
 *   form.setValue('.name', 'John');
 *   form.setChecked('#agree', true);
 *   form.onUpdate('input', el => console.log(el.value));
 *
 * @author Andrey Shpigunov
 * @version 0.2
 * @since 2025-07-17
 */
 
import { lib } from './lib';

class Form {
  /**
   * Creates a Form utility instance.
   * Stores internal references to event listeners.
   */
  constructor() {
    /**
     * Stores event listener references to avoid duplicates.
     *
     * @readonly
     * @type {{update: Set<HTMLElement>}}
     */
    this.listen = Object.freeze({
      update: new Set(),
    });
  }

  /**
   * Determines the appropriate event type for an element.
   *
   * @param {HTMLElement} el - Target element.
   * @returns {string} 'input' or 'change' depending on the element type.
   * @throws {Error} If the element is unsupported.
   */
  getEventType(el) {
    if (el.isContentEditable) return 'input';

    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return 'input';
    if (tag === 'select') return 'change';

    throw new Error(`Unsupported element <${tag}>`);
  }

  /**
   * Sets the checked state of checkboxes or radios and dispatches 'input' event if changed.
   *
   * @param {string} selector - CSS selector for checkboxes or radios.
   * @param {boolean} [checked=false] - Desired checked state.
   */
  setChecked(selector, checked = false) {
    for (const el of lib.qsa(selector)) {
      if (!el?.type || (el.type !== 'checkbox' && el.type !== 'radio')) {
        console.error('setChecked: Not a checkbox/radio', el);
        continue;
      }

      if (el.checked !== checked) {
        el.checked = checked;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
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
    for (const el of lib.qsa(selector)) {
      if (!el) {
        console.error('setValue: Element not found', el);
        continue;
      }

      if (el.isContentEditable) {
        el.innerText = value;
      } else {
        const tag = el.tagName.toLowerCase();
        const type = el.type;

        if (tag === 'input') {
          if (type === 'checkbox' || type === 'radio') {
            el.checked = !!value;
          } else {
            el.value = value;
          }
        } else if (tag === 'textarea' || tag === 'select') {
          el.value = value;
        } else {
          throw new Error(`setValue: Unsupported element <${tag}>`);
        }
      }

      el.dispatchEvent(new Event(this.getEventType(el), { bubbles: true }));
    }
  }

  /**
   * Attaches input/change listeners to elements, preventing duplicates.
   *
   * @param {string} selector - CSS selector for elements.
   * @param {Function} callback - Function to call when input or change event fires.
   */
  onUpdate(selector, callback) {
    for (const el of lib.qsa(selector)) {
      if (!el) {
        console.error('onUpdate: Element not found', el);
        continue;
      }

      if (this.listen.update.has(el)) continue;

      el.addEventListener(this.getEventType(el), () => callback(el));
      this.listen.update.add(el);
    }
  }

  /**
   * Removes references to update listeners added by `onUpdate`.
   *
   * Note: Actual event listeners are not removed because they were added as anonymous functions.
   * This method only cleans the internal tracking set.
   *
   * @param {string} selector - CSS selector for elements.
   */
  offUpdate(selector) {
    for (const el of lib.qsa(selector)) {
      if (!el) continue;
      if (!this.listen.update.has(el)) continue;

      console.warn('offUpdate: Cannot fully remove listener because anonymous functions were used.');
      this.listen.update.delete(el);
    }
  }

  /**
   * Manually dispatches 'input' or 'change' events on the selected elements.
   *
   * @param {string} selector - CSS selector for elements.
   */
  update(selector) {
    for (const el of lib.qsa(selector)) {
      if (!el) {
        console.error('update: Element not found', el);
        continue;
      }

      el.dispatchEvent(new Event(this.getEventType(el), { bubbles: true }));
    }
  }
}

/**
 * Singleton export of the Form utility.
 * @type {Form}
 */
export const form = new Form();
