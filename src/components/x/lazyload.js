/**
 * @fileoverview Lazy loading of images using IntersectionObserver API.
 *
 * Observes images with the `x-lazyload` attribute and loads them when they approach the viewport.
 * Supports both `src` and `srcset` for responsive images. Automatically stops observing images
 * after they are loaded to improve performance.
 *
 * Exported singleton: `lazyload`
 *
 * Usage:
 *
 * Basic setup:
 *   import { lazyload } from './lazyload.js';
 *   lazyload.init();
 *
 * HTML structure:
 *   <img x-lazyload data-src="image.jpg" alt="Description">
 *   <img x-lazyload data-srcset="small.jpg 300w, large.jpg 800w" alt="Responsive image">
 *
 * With both src and srcset:
 *   <img x-lazyload
 *        data-src="fallback.jpg"
 *        data-srcset="small.jpg 300w, medium.jpg 600w, large.jpg 1200w"
 *        sizes="(max-width: 600px) 300px, (max-width: 1200px) 600px, 1200px"
 *        alt="Responsive image">
 *
 * CSS for loading state:
 *   img[x-lazyload] {
 *     opacity: 0;
 *     transition: opacity 0.3s;
 *   }
 *   img[x-lazyload].loaded {
 *     opacity: 1;
 *   }
 *
 * Placeholder image:
 *   <img x-lazyload
 *        src="placeholder.jpg"
 *        data-src="actual-image.jpg"
 *        alt="Image with placeholder">
 *
 * Public API:
 *
 * @method init() - Initializes lazy loading for all images with [x-lazyload] attribute.
 *   Observes images that haven't been loaded yet (don't have 'loaded' class).
 *   Safe to call multiple times - will only observe images that aren't already being observed.
 *   @example
 *     lazyload.init();
 *
 * @method destroy() - Stops observing all images and disconnects the observer.
 *   Use this when you need to clean up, for example when navigating away from a page.
 *   @example
 *     lazyload.destroy();
 *
 * Attributes:
 *
 * - `x-lazyload` - Required attribute to mark image for lazy loading
 * - `data-src` - Source URL for the image (replaces `src` after loading)
 * - `data-srcset` - Source set for responsive images (replaces `srcset` after loading)
 * - `src` - Optional placeholder image (will be replaced by `data-src`)
 * - `srcset` - Optional placeholder srcset (will be replaced by `data-srcset`)
 *
 * How it works:
 *
 * 1. On `init()`, finds all images with `[x-lazyload]` attribute
 * 2. Creates IntersectionObserver with 200px rootMargin (loads images before they enter viewport)
 * 3. When image approaches viewport (within 200px), starts loading:
 *    - Preloads image using temporary Image object
 *    - Sets `src`/`srcset` attributes from `data-src`/`data-srcset`
 *    - Removes `data-src` and `data-srcset` attributes
 *    - Adds `loaded` class for CSS styling
 *    - Stops observing the image
 *
 * Observer options:
 *
 * - `rootMargin: '200px'` - Starts loading images 200px before they enter viewport
 * - `threshold: 0.1` - Triggers when 10% of image is visible
 *
 * Browser support:
 *
 * - Requires IntersectionObserver API support
 * - Modern browsers (Chrome 51+, Firefox 55+, Safari 12.1+, Edge 15+)
 * - Falls back gracefully with console warning if not supported
 *
 * Performance tips:
 *
 * - Use appropriate placeholder images to prevent layout shift
 * - Set width and height attributes to reserve space
 * - Use `data-srcset` for responsive images to reduce bandwidth
 * - Images are automatically unobserved after loading to reduce overhead
 *
 * Next.js: call lazyload.init() in useEffect; in cleanup call lazyload.destroy().
 *
 * @example
 * // Next.js — layout or _app
 * useEffect(() => {
 *   lazyload.init();
 *   return () => lazyload.destroy();
 * }, []);
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
   * Initializes lazy loading for all [x-lazyload] images not yet loaded.
   * SSR-safe: no-op when window or document is undefined.
   */
  init() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!('IntersectionObserver' in window)) return;

    if (!this._observer) {
      this._observer = new IntersectionObserver(this._callback.bind(this), this._options);
    }

    const images = lib.qsa('[x-lazyload]');
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img.classList.contains('loaded')) this._observer.observe(img);
    }
  }

  /**
   * Disconnects observer and clears reference. Use on SPA unmount or Next.js cleanup.
   * SSR-safe: no-op when window is undefined.
   */
  destroy() {
    if (typeof window === 'undefined') return;
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }

  /**
   * IntersectionObserver callback. Loads image when it enters viewport.
   *
   * @param {IntersectionObserverEntry[]} entries
   * @private
   */
  _callback(entries) {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.isIntersecting || !entry.target) continue;
      this._loadImage(entry.target);
    }
  }

  /**
   * Preloads image via temporary Image. Resolves on load, rejects on error.
   *
   * @param {string|null} src
   * @param {string|null} srcset
   * @returns {Promise<void>}
   * @private
   */
  _fetchImage(src, srcset) {
    return new Promise((resolve, reject) => {
      if (!src && !srcset) {
        reject(new Error('lazyload: no src or srcset'));
        return;
      }
      const img = new Image();
      img.onload = resolve;
      img.onerror = () => reject(new Error('lazyload: load failed'));
      if (srcset) img.srcset = srcset;
      if (src) img.src = src;
    });
  }

  /**
   * Loads one image: fetches, sets src/srcset, adds .loaded, unobserves.
   *
   * @param {HTMLImageElement} img
   * @returns {Promise<void>}
   * @private
   */
  _loadImage(img) {
    if (!img || img.nodeName !== 'IMG') return;

    const src = img.getAttribute('data-src');
    const srcset = img.getAttribute('data-srcset');
    if (!src && !srcset) {
      if (this._observer) this._observer.unobserve(img);
      return;
    }

    const obs = this._observer;
    this._fetchImage(src || null, srcset || null)
      .then(() => {
        if (srcset) {
          img.srcset = srcset;
          img.removeAttribute('data-srcset');
        }
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
        }
        img.classList.add('loaded');
        if (obs) obs.unobserve(img);
      })
      .catch(() => {
        if (obs) obs.unobserve(img);
      });
  }
}

/**
 * Singleton export of Lazyload.
 * @type {Lazyload}
 */
export const lazyload = new Lazyload();
