/**
 * @fileoverview Simple photo slider on mouseover.
 *
 * Converts elements with `[x-slides]` into interactive photo sliders.
 * Loads images lazily, supports dynamic DOM updates, and shows dot indicators.
 *
 * Public API:
 *
 * - `slides.init()` – Initializes all `[x-slides]` elements on the page.
 *
 * Example usage:
 *
 * HTML:
 * <div x-slides="['photo1.jpg','photo2.jpg','photo3.jpg']">
 *   <img src="photo1.jpg"/>
 * </div>
 *
 * JS:
 * slides.init();
 *
 * Behavior:
 * - On mouseenter, initializes slider and preloads images.
 * - On mousemove, changes images based on cursor position.
 * - Shows dot indicators for each slide.
 * - Resets to the first image on mouseout.
 *
 * Mobile devices skip initialization (no hover support).
 *
 * @author Andrey Shpigunov
 * @version 0.2
 * @since 2025-07-17
 */

import { device } from './device';
import { lib } from './lib';

/**
 * Slides component controller.
 */
class Slides {
  constructor() {
    this._preloadedImages = new Set();
  }

  /**
   * Initializes all `[x-slides]` elements on the page.
   *
   * - Skips on touch devices.
   * - Sets up lazy initialization on `mouseenter`.
   * - Observes DOM for dynamically added `[x-slides]` elements.
   */
  init() {
    const sliders = lib.qsa('[x-slides]');

    if (device.touch) {
      for (const slider of sliders) slider.removeAttribute('x-slides');
      return;
    }

    sliders.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        if (!el.dataset.slidesInited) {
          this._initSlider(el);
          el.dataset.slidesInited = 'true';
        }
      }, { once: true });
    });

    this._observeDOM();
  }

  /**
   * Observes the DOM for dynamically added `[x-slides]` elements.
   * @private
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
   * Checks if the added node or its children contain `[x-slides]` and prepares lazy init.
   *
   * @param {Node} node - Newly added DOM node.
   * @private
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
   * Preloads images and sets up `mouseenter` event if not yet initialized.
   *
   * @param {HTMLElement} el - Element with `[x-slides]`.
   * @private
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
   *
   * @param {HTMLElement} el - Element with `[x-slides]`.
   * @private
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

    for (let i = 0; i < unique.length; i++) {
      const dot = `<div class="slides-item ${i === 0 ? 'active' : ''}"></div>`;
      lib.render('#' + id, dot, 'beforeend');
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
   * Binds `mousemove` and `mouseout` events to a slider.
   *
   * @param {Object} item - Slider data object.
   * @private
   */
  _bindEvents(item) {
    item.element.addEventListener('mousemove', lib.throttle(event => {
      item.rect = item.element.getBoundingClientRect();
      this._update(event, item);
    }, 100));

    item.element.addEventListener('mouseout', () => {
      this._reset(item);
    });

    window.addEventListener('resize', () => {
      item.rect = item.element.getBoundingClientRect();
    });
  }

  /**
   * Updates the image and active dot based on cursor position.
   *
   * @param {MouseEvent} event
   * @param {Object} item - Slider data object.
   * @private
   */
  _update(event, item) {
    const x = Math.max(0, event.clientX - item.rect.left);
    const slide = Math.floor(x / (item.rect.width / item.count));

    if (item.img.src !== item.array[slide]) {
      item.img.src = item.array[slide];
      this._setActiveItem(item, slide);
    }
  }

  /**
   * Resets the image and dots to the first slide.
   *
   * @param {Object} item - Slider data object.
   * @private
   */
  _reset(item) {
    item.img.src = item.array[0];
    item.img.setAttribute('src', item.array[0]);
    this._setActiveItem(item, 0);
  }

  /**
   * Sets active dot indicator.
   *
   * @param {Object} item - Slider data object.
   * @param {number} index - Active slide index.
   * @private
   */
  _setActiveItem(item, index) {
    lib.removeClass(item.dots, 'active');
    lib.addClass(item.dots[index], 'active');
  }

  /**
   * Preloads an array of image URLs.
   *
   * @param {string[]} urls - Array of image URLs.
   * @private
   */
  _preloadImages(urls) {
    for (const url of urls) {
      if (this._preloadedImages.has(url)) continue;
      const img = new Image();
      img.src = url;
      this._preloadedImages.add(url);
    }
  }
}

/**
 * Singleton export of Slides.
 * @type {Slides}
 */
export const slides = new Slides();
