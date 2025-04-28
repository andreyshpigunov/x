//
//  scroll.js / x
//  Scroll
//
//  Created by Andrey Shpigunov at 20.03.2025
//  All right reserved.
//
//  Scrolls page or scrollable container to target element.
//  Automatically applies to elements with x-scrollto attribute.
//
//  Usage examples:
//  <div id="top">...</div>
//  <a x-scrollto="top">Up</a>
//  or
//  <a x-scrollto='{
//    "parent": "#container",      // scroll container (default: window)
//    "target": "#top",            // required
//    "offset": 0,                 // optional vertical offset in px
//    "classActive": "active",     // optional class to toggle
//    "hash": false                // update location hash (default: false)
//  }'>Up</a>
//
//  API:
//    scroll.scrollTo('element id / selector / DOM node')
//    scroll.scrollTo({ target: "#id", offset: 20, parent: ".scroll-wrap" })
//    scroll.to(...) — alias for scrollTo
//
//  Supports async:
//    scroll.to(...).then(() => { console.log('Scroll finished') })
//


import { lib } from './lib';

class Scroll {
  constructor() {
    this.parent = window;            // default scroll container
    this.offset = 0;                 // default offset in px
    this.classActive = 'active';     // default class to toggle
    this.hash = false;               // update hash in URL
    this.to = this.scrollTo;         // alias for convenience
  }

  /**
   * Initializes automatic handling of elements with [x-scrollto] attribute.
   * Parses config from JSON or string selector, attaches click event,
   * and sets up IntersectionObserver to track visible sections.
   */
  init() {
    let links = lib.qsa('[x-scrollto]');
    if (links.length) {
      let linksHash = {};

      for (let link of links) {
        try {
          let item = {};
          let attr = link.getAttribute('x-scrollto');

          // Case: JSON format
          if (lib.isValidJSON(attr)) {
            let json = JSON.parse(attr);
            if (json.hasOwnProperty('target') && lib.qs(json.target)) {
              item.link = link;
              item.parent = json.parent || this.parent;
              item.target = lib.qs(json.target);
              item.offset = json.offset || this.offset;
              item.classActive = json.classActive || this.classActive;
              item.hash = json.hash || this.hash;
            } else {
              console.error('Target required or not found: ' + JSON.stringify(json));
            }
          }
          // Case: plain selector or ID
          else {
            if (lib.qs(attr)) {
              item.link = link;
              item.parent = this.parent;
              item.target = lib.qs(attr);
              item.offset = this.offset;
              item.classActive = this.classActive;
              item.hash = this.hash;
            } else {
              console.error(`Target "${attr}" not found.`);
            }
          }

          // If valid link/target, attach click handler
          if (item.link && item.target) {
            linksHash[lib.makeId()] = item;
            link.removeAttribute('x-scrollto');
            link.addEventListener('click', async (event) => {
              event.preventDefault();
              if (link._scrolling) return;
              link._scrolling = true;

              await this.scrollTo({
                parent: item.parent,
                target: item.target,
                offset: item.offset,
                classActive: item.classActive,
                hash: item.hash
              });

              link._scrolling = false;
            });
          }
        } catch (err) {
          console.error(err);
        }
      }

      // Activate scroll tracking
      if (Object.keys(linksHash).length) {
        this._scrollObserve(linksHash);
      }
    }
  }

  /**
   * Smoothly scrolls the parent element to the target element.
   * Waits until scroll finishes or a timeout occurs.
   * @param {string|Element|Object} params - selector, element, or settings object
   * @returns {Promise<void>}
   */
  async scrollTo(params) {
    return new Promise(resolve => {
      let parent, target, offset, hash;
  
      // Object form
      if (typeof params === 'object') {
        parent = params.parent ? lib.qs(params.parent) : this.parent;
        target = lib.qs(params.target);
        offset = params.offset || this.offset;
        hash = params.hash || this.hash;
      }
      // String or element form
      else {
        parent = this.parent;
        target = lib.qs(params);
        offset = this.offset;
        hash = this.hash;
      }
  
      if (!target) {
        console.warn('Scroll target not found:', target);
        resolve();
        return;
      }
  
      const { startingY, diff } = this._getScrollDiff(parent, target, offset);
  
      if (!parent || typeof parent.scrollTo !== 'function') {
        resolve();
        return;
      }
  
      const startScroll = () => {
        parent.scrollTo({
          top: startingY + diff,
          left: 0,
          behavior: 'smooth'
        });
  
        if (hash && target.id) {
          lib.updateURL('#' + target.id);
        } else if (hash) {
          history.replaceState({}, document.title, window.location.href.split('#')[0]);
        }
      };
  
      const isWindow = parent === window;
      const getScrollTop = () => isWindow ? parent.pageYOffset : parent.scrollTop;
      const targetY = startingY + diff;
      const threshold = 2;
      const maxWaitTime = 3000; // 3 seconds timeout
      let finished = false;
      let timeoutId;
  
      const cleanup = () => {
        if (isWindow) {
          window.removeEventListener('scroll', onScroll);
        } else {
          parent.removeEventListener('scroll', onScroll);
        }
        if (timeoutId) clearTimeout(timeoutId);
      };
  
      const finish = () => {
        if (!finished) {
          finished = true;
          cleanup();
          resolve();
        }
      };
  
      const onScroll = () => {
        const currentY = getScrollTop();
        if (Math.abs(currentY - targetY) < threshold) {
          requestAnimationFrame(finish);
        }
      };
  
      // Even if no scrolling needed, keep async behavior
      if (Math.abs(diff) < threshold) {
        requestAnimationFrame(resolve);
        return;
      }
  
      if (isWindow) {
        window.addEventListener('scroll', onScroll, { passive: true });
      } else {
        parent.addEventListener('scroll', onScroll, { passive: true });
      }
  
      timeoutId = setTimeout(finish, maxWaitTime);
      startScroll();
    });
  }

  /**
   * Calculates scroll position difference for target element inside container.
   * @private
   */
  _getScrollDiff(parent, target, offset) {
    if (parent === window) {
      const startingY = window.pageYOffset;
      const elementY = target.getBoundingClientRect().top + startingY;
      return {
        startingY,
        diff: elementY - startingY - offset
      };
    } else {
      const startingY = parent.scrollTop;
      const parentY = parent.getBoundingClientRect().top;
      const elementY = target.getBoundingClientRect().top + parent.scrollTop - parentY;
      return {
        startingY,
        diff: elementY - startingY - offset
      };
    }
  }

  /**
   * Sets up IntersectionObserver to track visible targets,
   * and apply active classes to links and sections.
   * @private
   */
  _scrollObserve(linksHash) {
    if (this._observer) this._observer.disconnect();

    const items = Object.values(linksHash);

    this._observer = new IntersectionObserver((entries) => {
      // Collect all currently visible targets
      const intersectingTargets = new Set();

      entries.forEach(entry => {
        if (entry.isIntersecting) {
          intersectingTargets.add(entry.target);
        }
      });

      if (!intersectingTargets.size) return;

      // Pick the one that is visually lowest (deepest)
      let targetToActivate = null;
      let maxTop = -Infinity;

      for (let item of items) {
        if (intersectingTargets.has(item.target)) {
          const top = item.target.getBoundingClientRect().top;
          if (top > maxTop) {
            maxTop = top;
            targetToActivate = item;
          }
        }
      }

      // Remove active class from all
      items.forEach(item => {
        if (item.classActive) {
          item.link.classList.remove(item.classActive);
          item.target.classList.remove(item.classActive);
        }
      });

      // Add active class to selected
      if (targetToActivate && targetToActivate.classActive) {
        targetToActivate.link.classList.add(targetToActivate.classActive);
        targetToActivate.target.classList.add(targetToActivate.classActive);
      }

    }, {
      root: null,
      rootMargin: '0px 0px -60% 0px', // triggers when top 40% of the viewport is crossed
      threshold: 0,
    });

    // Observe each target element
    items.forEach(item => {
      if (item.target instanceof Element) {
        this._observer.observe(item.target);
      }
    });
  }
}

export const scroll = new Scroll();
