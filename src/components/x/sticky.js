//
//  sticky.js / x
//  Sticky element on scroll
//
//  Created by Andrey Shpigunov at 20.03.2025
//  All rights reserved.
//
//  Adds the 'sticky_on' class to elements with the 'sticky' class
//  when they are no longer fully visible in the viewport.
//

import { lib } from './lib';

class Sticky {
  constructor() {
    // Create one shared IntersectionObserver for all sticky elements
    this._observer = new IntersectionObserver(
      ([entry]) => {
        // Toggle the 'sticky_on' class based on visibility
        lib.switchClass(entry.target, entry.intersectionRatio < 1, 'sticky_on');
      },
      {
        threshold: 1,                     // Trigger only when element is fully visible/invisible
        rootMargin: '-1px 0px 0px 0px'    // Small negative margin to trigger slightly earlier
      }
    );
  }

  /**
   * Initializes observation for all elements with the 'sticky' class.
   * Adds the 'sticky_on' class when the element scrolls out of view.
   */
  init() {
    const stickies = lib.qsa('.sticky');
    for (let item of stickies) {
      if (!item.dataset.stickyObserved) {
        this._observer.observe(item);
        item.dataset.stickyObserved = 'true';
      }
    }
  }

  /**
   * Stops observing all currently tracked sticky elements and removes tracking flags.
   */
  reset() {
    const stickies = lib.qsa('.sticky');
    for (let item of stickies) {
      if (item.dataset.stickyObserved) {
        this._observer.unobserve(item);
        delete item.dataset.stickyObserved;
      }
    }
  }

  /**
   * Re-initializes all sticky elements. Useful when content is dynamically changed.
   */
  refresh() {
    this.reset();
    this.init();
  }
}

// Export a singleton instance of Sticky
export const sticky = new Sticky();
