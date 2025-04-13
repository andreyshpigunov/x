//
//  lazyload.js / x
//  Lazyload images using IntersectionObserver
//
//  Created by Andrey Shpigunov at 12.04.2025
//  All rights reserved.
//
//  This module automatically loads images when they enter the viewport,
//  by observing elements with the `x-lazyload` attribute.
//
//  Available methods:
//    init()                 — initializes lazy loading for images with [x-lazyload]
//    _loadImage(img, obs)   — handles loading of a single image when it becomes visible
//    _fetchImage(src, set)  — preloads an image and returns a Promise
//

import { lib } from './lib';

class Lazyload {
  /**
   * Initializes the lazyload functionality.
   * Observes all images with [x-lazyload] that haven't been loaded yet.
   * Loads images when they approach or enter the viewport.
   */
  init() {
    // Select all images with the 'x-lazyload' attribute that are not yet marked as loaded
    const images = [...lib.qsa('[x-lazyload]')].filter(img => !img.classList.contains('loaded'));

    /**
     * IntersectionObserver callback:
     * When an observed image enters the viewport, trigger loading.
     */
    const callback = (entries, observer) => {
      for (let entry of entries) {
        if (entry.isIntersecting) {
          this._loadImage(entry.target, observer);
        }
      }
    };

    // Observer options:
    const options = {
      root: null,             // Use the browser viewport as the root
      rootMargin: '200px',    // Start loading when the image is near (200px away)
      threshold: 0.1          // Trigger when 10% of the image is visible
    };

    // Create the observer instance
    const observer = new IntersectionObserver(callback, options);

    // Observe each image
    images.forEach(image => observer.observe(image));
  }

  /**
   * Preloads an image from a given src/srcset.
   * Creates a new Image() element and resolves when it is fully loaded.
   *
   * @param {string|null} src - Image source URL.
   * @param {string|null} srcset - Image srcset string (for responsive images).
   * @returns {Promise<void>}
   */
  _fetchImage(src, srcset) {
    return new Promise((resolve, reject) => {
      const image = new Image();  // Create a temporary <img> element

      if (srcset) image.srcset = srcset; // Assign srcset if provided
      if (src) image.src = src;          // Assign src if provided

      image.onload = resolve; // Resolve when image loads successfully
      image.onerror = () => reject(new Error(`Failed to load image: ${src || srcset}`)); // Reject on failure
    });
  }

  /**
   * Loads a lazy image when it becomes visible in the viewport.
   * Sets the actual src/srcset, marks it as loaded, and stops observing it.
   *
   * @param {HTMLImageElement} img - The image element to load.
   * @param {IntersectionObserver} observer - The observer that triggered the load.
   */
  async _loadImage(img, observer) {
    const srcset = img.dataset.srcset || null;  // Read srcset from data attribute
    const src = img.dataset.src || null;        // Read src from data attribute

    // Warn and exit if no valid image sources are provided
    if (!src && !srcset) {
      console.warn('No source or srcset found for image:', img);
      return;
    }

    try {
      // Preload the image (hidden)
      await this._fetchImage(src, srcset);

      // Assign srcset if available, then remove the data-srcset attribute
      if (srcset) {
        img.srcset = srcset;
        img.removeAttribute('data-srcset');
      }

      // Assign src if available, then remove the data-src attribute
      if (src) {
        img.src = src;
        img.removeAttribute('data-src');
      }

      // Add 'loaded' class to mark the image as finished loading (for styles/JS)
      if (srcset || src) {
        await lib.addClass(img, 'loaded');
      }

      // Stop observing the image now that it has loaded
      observer.unobserve(img);
    } catch (err) {
      console.error('Lazyload failed for image:', img, err);
    }
  }
}

// Export singleton instance
export const lazyload = new Lazyload();
