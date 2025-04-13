//
//  appear.js / x
//  Element visibility observer
//
//  Created by Andrey Shpigunov at 12.04.2025
//  All rights reserved.
//
//  This module detects when elements appear in the viewport
//  and applies CSS classes to them accordingly.
//  Intended for triggering animations or visual effects.
//
//  Usage:
//    <div x-appear>Hello!</div>
//
//  It will apply:
//    - 'appeared' class once when the element first appears
//    - 'visible' class while the element is currently visible
//
//  You can customize class names and behavior via init({ appearedClass, visibleClass, once })
//
//  Available methods:
//    init(config)   — Initializes the observer and starts tracking elements
//    update()       — Reapplies observer to elements (useful after DOM updates)
//

import { lib } from './lib';

class Appear {
  constructor() {
    // List of observed elements
    this.targets = [];

    // IntersectionObserver instance
    this.observer = null;

    // Default options
    this.options = {
      appearedClass: 'appeared',  // Added once when element first appears
      visibleClass: 'visible',    // Added while element is visible
      once: false                 // If true, stops observing after first appearance
    };
  }

  /**
   * Initializes the IntersectionObserver and observes all [x-appear] elements.
   *
   * @param {Object} config - Optional configuration to override defaults.
   * @param {string} [config.appearedClass] - Class added once when element first appears.
   * @param {string} [config.visibleClass] - Class added/removed while element is visible/invisible.
   * @param {boolean} [config.once=false] - If true, unobserve after first intersection.
   */
  init(config = {}) {
    // Exit if IntersectionObserver is not supported
    if (!('IntersectionObserver' in window)) return;

    // Merge default options with custom configuration
    this.options = {
      ...this.options,
      ...config
    };

    // Select all elements with [x-appear] attribute
    this.targets = lib.qsa('[x-appear]');
    if (this.targets.length) {
      // Create a new observer instance
      this.observer = new IntersectionObserver(this._observerCallback.bind(this));

      // Start observing each target
      this.targets.forEach(item => this.observer.observe(item));
    }
  }

  /**
   * Callback for IntersectionObserver when visibility of observed elements changes.
   *
   * @param {IntersectionObserverEntry[]} entries - List of visibility change events.
   * @private
   */
  _observerCallback(entries) {
    const { appearedClass, visibleClass, once } = this.options;

    for (let entry of entries) {
      const target = entry.target;

      const hasAppeared = appearedClass != null;
      const hasVisible = visibleClass != null;

      if (entry.isIntersecting) {
        // First time visibility — add appeared class
        if (hasAppeared && !target.classList.contains(appearedClass)) {
          target.classList.add(appearedClass);
          if (once) {
            // Stop observing if 'once' mode is active
            this.observer.unobserve(target);
          }
        }

        // While visible — add visible class and dispatch event
        if (hasVisible) {
          target.classList.add(visibleClass);
          target.dispatchEvent(new CustomEvent('visible', {
            detail: { appeared: true }
          }));
        }
      } else {
        // When leaving viewport — remove visible class and dispatch event
        if (hasVisible && target.classList.contains(visibleClass)) {
          target.classList.remove(visibleClass);
          target.dispatchEvent(new CustomEvent('invisible', {
            detail: { appeared: true }
          }));
        }
      }
    }
  }

  /**
   * Reapplies observation to all current [x-appear] elements.
   * Useful when DOM has changed or new elements were added.
   */
  update() {
    // Refresh target list
    this.targets = lib.qsa('[x-appear]');

    // Re-observe each target
    this.targets.forEach(item => {
      this.observer.unobserve(item); // Stop current observation
      this.observer.observe(item);   // Start again
    });
  }
}

// Export singleton instance
export const appear = new Appear();
