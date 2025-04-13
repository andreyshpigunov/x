//
//  animate.js / x
//  Animations
//
//  Created by Andrey Shpigunov at 12.04.2025
//  All rights reserved.
//
//  This module enables scroll-based animations using configurable
//  parameters via the x-animate attribute.
//
//  Example:
//  <div x-animate='{
//    "parent": "#scroll-container",  // scroll context, default "window"
//    "trigger": ".trigger",          // element to track, default is the element itself
//    "start": "120vh",               // start of animation zone (e.g. in vh, %, or px)
//    "end": "0vh",                   // end of animation zone
//    "functionName": "coverOut",     // name of a function to execute during animation
//    "class": "fixed",               // class to add when inside animation zone
//    "classRemove": true             // remove class when leaving zone
//  }'></div>
//
//  Available methods:
//    init()              — Initialize and observe all [x-animate] elements
//    _scrollHandler()    — Optimized scroll handler (requestAnimationFrame)
//    _scroll(array)      — Calculates animation progress for each element
//    _2px(value, parent) — Converts start/end values to pixels
//

import { lib } from './lib';

class Animate {

  constructor() {
    this.ticking = false;              // Prevents multiple requestAnimationFrame calls
    this.animationsArray = [];         // All animation items
    this._scrollHandler = this._scrollHandler.bind(this); // Bind context
  }

  /**
   * Initializes all elements with the [x-animate] attribute.
   * Parses JSON configuration, stores elements, and sets up scroll listeners.
   */
  init() {
    const elements = lib.qsa('[x-animate]');
    if (!elements.length) return;

    elements.forEach((e) => {
      let json;
      try {
        json = JSON.parse(e.getAttribute('x-animate'));
      } catch (error) {
        console.warn('Invalid JSON in x-animate attribute:', e, error);
        return;
      }

      const item = {
        element: e,
        trigger: json.trigger && lib.qs(json.trigger) ? lib.qs(json.trigger) : e,
        parent: json.parent && lib.qs(json.parent) ? lib.qs(json.parent) : window,
        start: json.start,
        end: json.end || false,
        class: json.class,
        classRemove: json.classRemove,
        functionName: json.functionName,
        lockedIn: false,
        lockedOut: false,
        log: json.log || false
      };

      this.animationsArray.push(item);
      e.removeAttribute('x-animate'); // Clean up DOM attribute
    });

    if (!this.animationsArray.length) return;

    const parents = new Set();
    parents.add(window);

    // Add scroll listeners to each unique scroll container
    this.animationsArray.forEach(item => {
      if (!parents.has(item.parent)) {
        parents.add(item.parent);
        item.parent.addEventListener('scroll', this._scrollHandler, { passive: true });
      }
    });

    window.addEventListener('scroll', this._scrollHandler, { passive: true });

    // Trigger initial animation evaluation after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._scroll(this.animationsArray));
    } else {
      this._scroll(this.animationsArray);
    }
  }

  /**
   * Scroll event handler optimized with requestAnimationFrame.
   * Batches updates to improve performance.
   * @private
   */
  _scrollHandler() {
    if (!this.ticking) {
      this.ticking = true;
      window.requestAnimationFrame(() => {
        this._scroll(this.animationsArray);
        this.ticking = false;
      });
    }
  }

  /**
   * Main animation update logic.
   * Calculates position and progress, applies classes and calls functions.
   * @param {Array} animationsArray - Array of configured animation items.
   * @private
   */
  _scroll(animationsArray) {
    animationsArray.forEach(item => {
      const triggerRect = item.trigger.getBoundingClientRect();
      const parentRect = item.parent !== window ? item.parent.getBoundingClientRect() : null;

      const top = triggerRect.top - (parentRect ? parentRect.top : 0);
      const start = this._2px(item.start, item.parent);
      const end = this._2px(item.end, item.parent);
      item.duration = isNaN(end) ? 0 : start - end;

      if (item.log) {
        console.log(top, start, end, item);
      }

      // === Case: start and end defined ===
      if (!isNaN(start) && !isNaN(end)) {
        if (top <= start && top >= end) {
          item.lockedOut = false;
          if (item.class) item.element.classList.add(item.class);

          if (typeof window[item.functionName] === 'function') {
            item.progress = ((start - top) / item.duration).toFixed(4);
            window[item.functionName](item);
          }

        } else {
          if (
            item.class &&
            item.classRemove === true &&
            item.element.classList.contains(item.class)
          ) {
            item.element.classList.remove(item.class);
          }

          if (!item.lockedOut && typeof window[item.functionName] === 'function') {
            if (top >= start) {
              item.progress = 0;
              window[item.functionName](item);
              item.lockedOut = true;
            }
            if (top <= end) {
              item.progress = 1;
              window[item.functionName](item);
              item.lockedOut = true;
            }
          }
        }

      // === Case: only start defined ===
      } else if (!isNaN(start)) {
        if (top <= start) {
          item.lockedOut = false;
          if (item.class) item.element.classList.add(item.class);

          if (!item.lockedIn && typeof window[item.functionName] === 'function') {
            item.progress = 1;
            window[item.functionName](item);
            item.lockedIn = true;
          }

        } else {
          item.lockedIn = false;

          if (
            item.class &&
            item.classRemove === true &&
            item.element.classList.contains(item.class)
          ) {
            item.element.classList.remove(item.class);
          }

          if (!item.lockedOut && typeof window[item.functionName] === 'function') {
            if (top >= start) {
              item.progress = 0;
              window[item.functionName](item);
              item.lockedOut = true;
            }
          }
        }
      }
    });
  }

  /**
   * Converts a value like '120vh', '50%' or '300' into pixels.
   * @param {string|number} value - Value to convert.
   * @param {HTMLElement|Window} parent - Scroll parent (for % and vh).
   * @returns {number} Pixel equivalent.
   * @private
   */
  _2px(value, parent = window) {
    if (/(%|vh)/.test(value)) {
      const height = parent === window
        ? document.documentElement.clientHeight
        : parent.clientHeight;

      value = value.replace(/(vh|%)/, '');
      return (height * parseFloat(value)) / 100;
    } else {
      return parseFloat(value);
    }
  }
}

export const animate = new Animate();
