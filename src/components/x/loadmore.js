//
//  loadmore.js / x
//  Loadmore
//
//  Created by Andrey Shpigunov at 12.04.2025
//  All rights reserved.
//
//  Automatically triggers a callback function when an element becomes visible
//  from the bottom of the viewport (infinite scroll).
//
//  Usage:
//  <div x-loadmore='{"functionName": "load"}'>...</div>
//
//  The callback function should accept a "page" parameter:
//  function load(page) { ... return true/false; }
//
//  - true → more content available, keep observing
//  - false → stop observing this element
//

import { lib } from './lib';

class Loadmore {
  constructor() {
    // Store tracked elements and their current page state
    this.items = {};

    // Prevents multiple triggers during concurrent load
    this.locked = false;
  }

  /**
   * Initializes the loadmore system by observing all [x-loadmore] elements.
   * When the element enters the viewport (with bottom padding),
   * calls the defined callback function.
   */
  init() {
    const blocks = lib.qsa('[x-loadmore]');
    if (!blocks.length) return;

    // IntersectionObserver callback
    const callback = async (entries, observer) => {
      for (let entry of entries) {
        // Only trigger when the element becomes visible and not locked
        if (entry.isIntersecting && !this.locked) {
          this.locked = true;

          const el = entry.target;
          const loadmoreAttr = el.getAttribute('x-loadmore');

          // Parse and validate JSON from x-loadmore attribute
          if (lib.isValidJSON(loadmoreAttr)) {
            const json = JSON.parse(loadmoreAttr);

            if (json.functionName) {
              const fn = window[json.functionName];

              if (typeof fn === 'function') {
                try {
                  const id = el.id;
                  const page = this.items[id].page;

                  // Execute callback with current page
                  const hasMore = await fn(page);

                  if (hasMore) {
                    this.items[id].page++;
                  } else {
                    // Stop observing if no more pages
                    observer.unobserve(el);
                  }
                } catch (error) {
                  console.error('Error executing loadmore callback:', error);
                }
              } else {
                console.error(`Function "${json.functionName}" is not defined.`);
              }
            } else {
              console.warn('Missing "functionName" in x-loadmore attribute:', json);
            }
          } else {
            console.error('Invalid JSON in x-loadmore attribute:', loadmoreAttr);
          }

          // Unlock after processing completes
          this.locked = false;
        }
      }
    };

    // Observer options: trigger when element is 400px from bottom of viewport
    const options = {
      rootMargin: '0px 0px 400px 0px',
      threshold: 0
    };

    // Create observer
    const observer = new IntersectionObserver(callback, options);

    // Observe all blocks
    blocks.forEach(block => {
      const id = lib.makeId();
      block.setAttribute('id', id);

      this.items[id] = {
        el: block,
        page: 1
      };

      observer.observe(block);
    });
  }
}

export const loadmore = new Loadmore();
