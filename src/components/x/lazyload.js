//
//  lazyload.js / x
//  Lazyload images using IntersectionObserver
//
//  Created by Andrey Shpigunov at 12.04.2025
//  All rights reserved.
//

/**
 * @fileoverview Lazy loading of images using IntersectionObserver.
 *
 * Observes images with the `x-lazyload` attribute and loads them when they approach the viewport.
 * Supports both `src` and `srcset` for responsive images.
 *
 * Exported singleton: `lazyload`
 *
 * Public API:
 *
 * - `lazyload.init()` – Initializes lazy loading for all images with `[x-lazyload]`.
 * - `lazyload.destroy()` – Stops observing all images and disconnects the observer.
 *
 * @author Andrey Shpigunov
 * @version 0.2
 * @since 2025-07-17
 */

import { lib } from './lib';

/**
 * Lazyload class for handling image loading on viewport entry.
 */
class Lazyload {
  constructor() {
    /**
     * IntersectionObserver instance.
     * @type {IntersectionObserver|null}
     * @private
     */
    this._observer = null;

    /**
     * Observer options.
     * @type {IntersectionObserverInit}
     * @private
     */
    this._options = {
      root: null,
      rootMargin: '200px',
      threshold: 0.1
    };
  }

  /**
   * Initializes the lazy loading of images.
   * Observes all images with the `[x-lazyload]` attribute that are not yet loaded.
   */
  init() {
    if (!('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver is not supported in this browser.');
      return;
    }

    // Reuse existing observer or create a new one
    if (!this._observer) {
      this._observer = new IntersectionObserver(this._callback.bind(this), this._options);
    }

    const images = [...lib.qsa('[x-lazyload]')].filter(img => !img.classList.contains('loaded'));
    images.forEach(image => this._observer.observe(image));
  }

  /**
   * Stops all observations and disconnects the observer.
   */
  destroy() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }

  /**
   * IntersectionObserver callback function.
   * Loads the image when it enters the viewport.
   *
   * @param {IntersectionObserverEntry[]} entries - List of observed entries.
   */
  _callback(entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        this._loadImage(entry.target);
      }
    }
  }

  /**
   * Preloads an image from a given `src` or `srcset` using a temporary Image object.
   *
   * @param {string|null} src - Image `src` URL.
   * @param {string|null} srcset - Image `srcset` attribute for responsive images.
   * @returns {Promise<void>} Resolves when the image is fully loaded.
   * @private
   */
  _fetchImage(src, srcset) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      if (srcset) image.srcset = srcset;
      if (src) image.src = src;

      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Failed to load image: ${src || srcset}`));
    });
  }

  /**
   * Loads an individual image when it becomes visible.
   * Sets its `src`/`srcset`, adds the `loaded` class, and unobserves it.
   *
   * @param {HTMLImageElement} img - The image element to load.
   * @returns {Promise<void>}
   * @private
   */
  async _loadImage(img) {
    const srcset = img.dataset.srcset || null;
    const src = img.dataset.src || null;

    if (!src && !srcset) {
      console.warn('No source or srcset found for image:', img);
      return;
    }

    try {
      await this._fetchImage(src, srcset);

      if (srcset) {
        img.srcset = srcset;
        img.removeAttribute('data-srcset');
      }

      if (src) {
        img.src = src;
        img.removeAttribute('data-src');
      }

      await Promise.resolve(lib.addClass(img, 'loaded'));

      if (this._observer) {
        this._observer.unobserve(img);
      }
    } catch (err) {
      console.error('Lazyload failed for image:', img, err);
    }
  }
}

/**
 * Singleton export of Lazyload.
 * @type {Lazyload}
 */
export const lazyload = new Lazyload();
