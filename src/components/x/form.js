//
//  form.js / x
//  Additional form element utilities
//
//  Created by Andrey Shpigunov at 12.04.2025
//  All rights reserved.
//
//  This utility module provides convenient helpers for working with forms.
//  It allows batch setting of input values, checkbox states, value tracking,
//  and custom input update handling.
//
//  Available methods:
//    setChecked(elements, checked = false) — Set checkbox or radio input(s) checked/unchecked
//    setValue(elements, value)             — Set value for various input types
//    onUpdate(elements, callback)          — Attach input/change listeners to elements
//    update(elements)                      — Manually dispatch an "update" event (input/change)
//

import { lib } from "./lib";

class Form {
  constructor() {
    this.listen = {
      update: new Set(), // Track elements already listening to avoid duplicate bindings
    };
  }

  /**
   * Sets the checked state of checkbox or radio input(s).
   * @param {string|HTMLElement|Array} elements - One or multiple elements/selectors.
   * @param {boolean} checked - Whether the checkbox/radio should be checked.
   */
  setChecked(elements, checked = false) {
    if (!Array.isArray(elements)) elements = [elements];

    for (const element of elements) {
      const el = lib.qs(element);
      if (!el) {
        console.error(`Element not found: ${element}`);
        continue;
      }

      el.checked = checked;
      el.dispatchEvent(new Event("input")); // Trigger input event for listeners
    }
  }

  /**
   * Sets the value of an input, textarea, select, or contenteditable element.
   * Automatically dispatches the appropriate input/change event.
   *
   * @param {string|HTMLElement|Array} elements - One or multiple elements/selectors.
   * @param {*} value - The value to assign.
   */
  setValue(elements, value) {
    if (!Array.isArray(elements)) elements = [elements];

    for (const element of elements) {
      const el = lib.qs(element);
      if (!el) {
        console.error(`Element not found: ${element}`);
        continue;
      }

      const tagName = el.tagName.toLowerCase();

      switch (tagName) {
        case "input":
          if (["checkbox", "radio"].includes(el.type)) {
            el.checked = !!value;
            el.dispatchEvent(new Event("input"));
          } else {
            el.value = value;
            el.dispatchEvent(new Event("input"));
          }
          break;

        case "textarea":
          el.value = value;
          el.dispatchEvent(new Event("input"));
          break;

        case "select":
          el.value = value;
          el.dispatchEvent(new Event("change"));
          break;

        case "div":
          if (el.isContentEditable) {
            el.innerText = value;
            el.dispatchEvent(new Event("input"));
            break;
          }
        // Fallthrough for unsupported types
        default:
          throw new Error(`Unsupported element: ${tagName}`);
      }
    }
  }

  /**
   * Attaches an input/change listener to elements.
   * Ensures each element only has one listener bound.
   *
   * @param {string|HTMLElement|Array} elements - One or more elements/selectors.
   * @param {function} callback - Callback function to call on change.
   */
  onUpdate(elements, callback) {
    if (!Array.isArray(elements)) elements = [elements];

    for (const element of elements) {
      const el = lib.qs(element);
      if (!el) {
        console.error(`Element not found: ${element}`);
        continue;
      }

      const tagName = el.tagName.toLowerCase();

      // Attach listener once per element
      const addOnce = (eventType) => {
        if (!this.listen.update.has(el)) {
          el.addEventListener(eventType, () => callback(el));
          this.listen.update.add(el);
        }
      };

      switch (tagName) {
        case "input":
        case "textarea":
          addOnce("input");
          break;

        case "select":
          addOnce("change");
          break;

        case "div":
          if (el.isContentEditable) {
            addOnce("input");
            break;
          }
        // Fallthrough for unsupported types
        default:
          throw new Error(`Unsupported element: ${tagName}`);
      }
    }
  }

  /**
   * Dispatches an "input" or "change" event manually on elements,
   * simulating user updates for reactivity/tracking purposes.
   *
   * @param {string|HTMLElement|Array} elements - One or more elements/selectors.
   */
  update(elements) {
    if (!Array.isArray(elements)) elements = [elements];

    for (const element of elements) {
      const el = lib.qs(element);
      if (!el) {
        console.error(`Element not found: ${element}`);
        continue;
      }

      const tagName = el.tagName.toLowerCase();

      switch (tagName) {
        case "input":
        case "textarea":
        case "div":
          el.dispatchEvent(new Event("input"));
          break;

        case "select":
          el.dispatchEvent(new Event("change"));
          break;

        // Fallthrough for unsupported types
        default:
          throw new Error(`Unsupported element: ${tagName}`);
      }
    }
  }
}

// Export singleton instance
export const form = new Form();
