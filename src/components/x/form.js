//
//  form.js
//  x | Additional form elements functions
//  Created by Andrey Shpigunov at 20.01.2025
//  All right reserved.
//
//
//  setChecked(element, checked = false) - set checkbox and radio as checked with dispatchEvent
//  setValue(element, value) - set input, textarea and select values with dispatchEvent
//  onUpdate(...args) - callback function after updating fields with setChecked, setValue and internal
//  update(element) - dispatch 'update' event manually
//

import { lib } from "./lib";

class Form {
  constructor() {
    // Events
    this.change = new Event("change");
    this.input = new Event("input");
    // Object with added events
    this.listen = {
      update: [],
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
      case "input":
      case "textarea":
        el.value = value;
        el.dispatchEvent(this.input);
        break;
      case "select":
        el.value = value;
        el.dispatchEvent(this.change);
        break;
      default:
        console.error(`Unsupported element: ${tagName}`);
        break;
    }
  }

  // Callback for events on elements
  // Supports input, textarea and select
  // Usage 1: onUpdate(element, callback)
  // Usage 2: onUpdate([el1, el2, ..., elN], callback)
  onUpdate(elements, callback) {
    if (!Array.isArray(elements)) elements = [elements];
    if (elements.length) {
      for (let element of elements) {
        let el = lib.qs(element);
        let tagName = el.tagName.toLowerCase();
        switch (tagName) {
          case "input":
          case "textarea":
            if (!this.listen.update.includes(el)) {
              el.addEventListener("input", () => callback(el));
              this.listen.update.push(el);
            } else {
              console.log(el, "Element always listening");
            }
            break;
          case "select":
            if (!this.listen.update.includes(el)) {
              el.addEventListener("change", () => callback(el));
              this.listen.update.push(el);
            } else {
              console.log(el, "Element always listening");
            }
            break;
          default:
            console.error(`Unsupported element: ${tagName}`);
            break;
        }
      }
    }
  }

  // Dispatch update event
  // Usage 1: update(element)
  // Usage 2: update([el1, el2, ..., elN])
  update(elements) {
    if (!Array.isArray(elements)) elements = [elements];
    if (elements.length) {
      for (let element of elements) {
        let el = lib.qs(element);
        let tagName = el.tagName.toLowerCase();
        switch (tagName) {
          case "input":
          case "textarea":
            el.dispatchEvent(this.input);
            break;
          case "select":
            el.dispatchEvent(this.change);
            break;
          default:
            console.error("Unsupported element: " + tagName);
            break;
        }
      }
    }
  }
}

export const form = new Form();
