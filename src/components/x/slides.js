/**
 * @fileoverview Simple photo slider on mouseover.
 *
 * Converts elements with `[x-slides]` into interactive photo sliders.
 * Loads images lazily, supports dynamic DOM updates, and shows dot indicators.
 *
 * Public API:
 *
 * - `slides.init()` – Initializes all `[x-slides]` elements on the page. Safe for multiple calls.
 * - `slides.destroy()` – Removes event listeners and observers.
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
 * - Mobile devices skip initialization (no hover support).
 *
 * @author Andrey Shpigunov
 * @version 0.4
 * @since 2025-07-18
 */

import { device } from './device';
import { lib } from './lib';

/**
 * Slides component controller.
 */
class Slides {
  constructor() {
    /**
     * Preloaded image URLs to avoid duplicate loading.
     * @type {Set<string>}
     * @private
     */
    this._preloadedImages = new Set();

    /**
     * Active sliders with their event handlers and state.
     * @type {Map<HTMLElement, Object>}
     * @private
     */
    this._sliders = new Map();

    /**
     * MutationObserver for dynamic DOM updates.
     * @type {MutationObserver|null}
     * @private
     */
    this._observer = null;

    /**
     * Initialization flag to control safe reinitialization.
     * @type {boolean}
     * @private
     */
    this._initialized = false;
  }

  /**
   * Initializes all `[x-slides]` elements on the page.
   * Safe for multiple calls. Automatically destroys previous listeners.
   */
  init() {
    if (this._initialized) {
      this.destroy();
    }

    const sliders = lib.qsa('[x-slides]');

    if (device.touch) {
      for (const slider of sliders) slider.removeAttribute('x-slides');
      return;
    }

    for (const el of sliders) {
      el.addEventListener('mouseenter', () => {
        if (!el.dataset.slidesInited) {
          this._initSlider(el);
          el.dataset.slidesInited = 'true';
        }
      }, { once: true });
    }

    this._observeDOM();
    this._initialized = true;
  }

  /**
   * Destroys all event listeners and observers.
   * Safe for multiple calls.
   */
  destroy() {
    for (const [el, sliderData] of this._sliders.entries()) {
      el.removeEventListener('mousemove', sliderData.mousemoveHandler);
      el.removeEventListener('mouseout', sliderData.mouseoutHandler);
      el.removeEventListener('mouseenter', sliderData.mouseenterHandler);
    }

    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }

    this._sliders.clear();
    this._initialized = false;
  }

  /**
   * Observes the DOM for dynamically added `[x-slides]` elements.
   * @private
   */
  _observeDOM() {
    this._observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            this._checkForSlides(node);
          }
        }
      }
    });
    this._observer.observe(document.body, { childList: true, subtree: true });
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

    const slider = {
      element: el,
      rect,
      img,
      array: unique,
      count,
      dots,
      activeIndex: 0,
      locked: false
    };

    el.classList.add('slides');

    // Event handlers
    const mousemoveHandler = lib.throttle(event => {
      slider.rect = el.getBoundingClientRect();
      this._update(event, slider);
    }, 100);

    const mouseoutHandler = () => {
      this._reset(slider);
    };

    const mouseenterHandler = () => {
      slider.locked = false;
    };

    el.addEventListener('mousemove', mousemoveHandler);
    el.addEventListener('mouseout', mouseoutHandler);
    el.addEventListener('mouseenter', mouseenterHandler);
    window.addEventListener('resize', () => {
      slider.rect = el.getBoundingClientRect();
    });

    this._sliders.set(el, {
      mousemoveHandler,
      mouseoutHandler,
      mouseenterHandler,
      slider
    });
  }

  /**
   * Updates the image and active dot based on cursor position.
   *
   * @param {MouseEvent} event
   * @param {Object} slider - Slider data object.
   * @private
   */
  _update(event, slider) {
    if (slider.locked) return; // Ignore updates after mouseout

    const x = Math.max(0, event.clientX - slider.rect.left);
    const slide = Math.floor(x / (slider.rect.width / slider.count));

    if (slider.activeIndex !== slide && slide >= 0 && slide < slider.count) {
      slider.img.src = slider.array[slide];
      this._setActiveItem(slider, slide);
      slider.activeIndex = slide;
    }
  }

  /**
   * Resets the image and dots to the first slide.
   * Ensures that no race condition occurs with mousemove.
   *
   * @param {Object} slider - Slider data object.
   * @private
   */
  _reset(slider) {
    slider.locked = true;
    slider.img.src = slider.array[0];
    this._setActiveItem(slider, 0);
    slider.activeIndex = 0;
  }

  /**
   * Sets active dot indicator.
   *
   * @param {Object} slider - Slider data object.
   * @param {number} index - Active slide index.
   * @private
   */
  _setActiveItem(slider, index) {
    lib.removeClass(slider.dots, 'active');
    lib.addClass(slider.dots[index], 'active');
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
 * Use `slides.init()` to initialize or reinitialize safely.
 *
 * @type {Slides}
 */
export const slides = new Slides();
