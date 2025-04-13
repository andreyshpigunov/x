//
//  slides.js / x
//  Slides of photos
//
//  Created by Andrey Shpigunov at 20.03.2025
//  All rights reserved.
//
//  Simple photo slider on mouseover.
//  <div x-slides="['photo1.jpg','photo2.jpg','photo3.jpg']">
//    <img src="photo1.jpg"/>
//  </div>
//

import { device } from './device';
import { lib } from './lib';

class Slides {
  constructor() {}

  /**
   * Initializes lazy loading for all [x-slides] elements.
   * On touch devices, removes the attribute and skips initialization.
   * Sets up DOM mutation observer to support dynamically added elements.
   */
  init() {
    let sliders = lib.qsa('[x-slides]');

    // Skip initialization on touch devices
    if (device.touch) {
      for (let slider of sliders) slider.removeAttribute('x-slides');
      return;
    }

    // Set up lazy init on mouseenter
    sliders.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        if (!el.dataset.slidesInited) {
          this._initSlider(el);
          el.dataset.slidesInited = 'true';
        }
      }, { once: true });
    });

    // Watch for dynamically added elements
    this._observeDOM();
  }

  /**
   * Observes DOM for dynamically added elements with x-slides attribute.
   */
  _observeDOM() {
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            this._checkForSlides(node);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Checks if added node or its children contain x-slides and prepares lazy init.
   */
  _checkForSlides(node) {
    if (node.hasAttribute?.('x-slides')) {
      this._prepareLazyInit(node);
    }

    const inner = node.querySelectorAll?.('[x-slides]');
    if (inner?.length) {
      inner.forEach(el => this._prepareLazyInit(el));
    }
  }

  /**
   * Preloads images and sets up mouseenter event if not already initialized.
   */
  _prepareLazyInit(el) {
    if (!el.dataset.slidesPreloaded) {
      try {
        const slides = JSON.parse(el.getAttribute('x-slides'));
        this._preloadImages(slides);
        el.dataset.slidesPreloaded = 'true';
      } catch (e) {
        console.warn('Invalid x-slides JSON on dynamic element', e);
      }
    }

    if (!el.dataset.slidesInited) {
      el.addEventListener('mouseenter', () => {
        this._initSlider(el);
      }, { once: true });
    }
  }

  /**
   * Initializes a single slider element.
   */
  _initSlider(el) {
    const slides = JSON.parse(el.getAttribute('x-slides'));
    const img = lib.qs('img', el);
    if (!img) {
      console.warn('No <img> inside x-slides element', el);
      return;
    }

    const unique = [...new Set(slides)];
    const count = unique.length;

    this._preloadImages(unique);

    const id = lib.makeId();
    lib.render(el, `<div id="${id}" class="slides-items"></div>`, 'beforeend');

    // Create dot indicators
    for (let i = 0; i < unique.length; i++) {
      const div = `<div class="slides-item ${i === 0 ? 'active' : ''}"></div>`;
      lib.render('#' + id, div, 'beforeend');
    }

    const rect = el.getBoundingClientRect();
    const dots = lib.qsa('div', lib.qs('#' + id));

    const item = {
      element: el,
      rect,
      img,
      array: unique,
      count,
      items: lib.qs('#' + id),
      dots
    };

    el.dataset.slidesInited = 'true';
    el.classList.add('slides');
    this._bindEvents(item);
  }

  /**
   * Binds mousemove and mouseout events to a slider.
   */
  _bindEvents(item) {
    item.element.addEventListener('mousemove', lib.throttle(event => {
      item.rect = item.element.getBoundingClientRect(); // Update rect if needed
      this._update(event, item);
    }, 50));

    item.element.addEventListener('mouseout', () => {
      this._reset(item);
    });
  }

  /**
   * Updates the image and active dot based on mouse position.
   */
  _update(event, item) {
    const x = Math.max(0, event.clientX - item.rect.left);
    let slide = Math.floor(x / (item.rect.width / item.count));

    if (item.img.src !== item.array[slide]) {
      item.img.src = item.array[slide];
      this._setActiveItem(item, slide);
    }
  }

  /**
   * Resets image and active dot to the first slide.
   */
  _reset(item) {
    if (item.img.src !== item.array[0]) {
      item.img.src = item.array[0];
      this._setActiveItem(item, 0);
    }
  }

  /**
   * Updates the active dot indicator.
   */
  _setActiveItem(item, index) {
    lib.removeClass(item.dots, 'active');
    lib.addClass(item.dots[index], 'active');
  }

  /**
   * Preloads an array of image URLs.
   */
  _preloadImages(urls) {
    for (const url of urls) {
      const img = new Image();
      img.src = url;
      img.onerror = () => console.warn(`Image failed to load: ${url}`);
    }
  }
}

export const slides = new Slides();
