/**
 * @fileoverview Lightweight, dependency-free slider with touch and mouse support.
 *
 * Provides smooth sliding functionality with deferred image loading, touch gestures, mouse interaction,
 * and automatic initialization via IntersectionObserver. Supports multiple independent sliders on the page.
 *
 * Features:
 * - Touch and mouse support
 * - Deferred image loading (first slide loads immediately, others on interaction)
 * - Rubber band effect at boundaries
 * - Automatic indicators for multiple slides
 * - Responsive to window resize and orientation changes
 * - Lazy initialization via IntersectionObserver
 *
 * Exported singleton: `slider`
 *
 * Usage:
 *
 * Basic setup:
 *   import { slider } from './slider.js';
 *   slider.init();
 *
 * HTML structure:
 *   <div x-slider>
 *     <div><img data-src="slide1.jpg" alt="Slide 1"></div>
 *     <div><img data-src="slide2.jpg" alt="Slide 2"></div>
 *     <div><img data-src="slide3.jpg" alt="Slide 3"></div>
 *   </div>
 *
 * With configuration:
 *   <div x-slider='{"gap":20,"rubber":true,"resetOnMouseout":true,"touch":true}'>
 *     <div><img data-src="slide1.jpg" alt="Slide 1"></div>
 *     <div><img data-src="slide2.jpg" alt="Slide 2"></div>
 *   </div>
 *
 * With responsive images:
 *   <div x-slider>
 *     <div>
 *       <img data-src="small.jpg"
 *            data-srcset="small.jpg 300w, medium.jpg 600w, large.jpg 1200w"
 *            alt="Slide 1">
 *     </div>
 *   </div>
 *
 * Public API:
 *
 * @method init() - Initializes slider system.
 *   Observes [x-slider] elements and initializes them when they enter viewport.
 *   Sets up MutationObserver to handle dynamically added sliders.
 *   Safe to call multiple times.
 *   @example
 *     slider.init();
 *
 * @method destroy() - Destroys all slider instances.
 *   Removes all event listeners and observers.
 *   Safe to call multiple times.
 *   @example
 *     slider.destroy();
 *
 * Configuration (x-slider attribute JSON):
 *
 * {
 *   "gap": number,              // Gap between slides in pixels (default: 0)
 *   "rubber": boolean,          // Enable rubber band effect at boundaries (default: true)
 *   "resetOnMouseout": boolean, // Reset to first slide on mouse leave (default: true)
 *   "touch": boolean            // Enable touch interactions (default: true)
 * }
 *
 * Behavior:
 *
 * Desktop (mouse):
 * - Hover over slider to navigate between slides
 * - Mouse position determines active slide
 * - Optionally resets to first slide on mouse leave
 * - First slide loads immediately, others on first hover
 *
 * Touch devices:
 * - Swipe left/right to navigate
 * - Rubber band effect at first/last slide (if enabled)
 * - First slide loads immediately, others on first touch
 *
 * Image loading:
 * - First slide image loads immediately (eager loading)
 * - Other slides load on first interaction (hover or touch)
 * - Supports data-src and data-srcset for lazy loading
 *
 * CSS classes:
 *
 * - `.slider` - Added to slider container
 * - `.slider-wrapper` - Wrapper for slides
 * - `.slider-item` - Individual slide
 * - `.slider-indicators` - Container for indicators
 * - `.slider_touch` - Added when touch is enabled
 * - `.active` - Active indicator dot
 *
 * SECURITY WARNINGS:
 *
 * 1. JSON parsing:
 *    - JSON from x-slider attribute is parsed
 *    - Only use trusted content in x-slider attributes
 *    - Invalid JSON is caught and logged
 *
 * 2. innerHTML usage:
 *    - innerHTML is used to clear container (safe: el.innerHTML = '')
 *    - Content is cloned from existing DOM nodes (safe)
 *
 * 3. Image sources:
 *    - Images use data-src and data-srcset attributes
 *    - Validate image URLs to prevent XSS
 *
 * Best practices:
 *
 * - Use descriptive alt text for images
 * - Optimize images for web (appropriate sizes)
 * - Test touch interactions on real devices
 * - Consider accessibility (keyboard navigation, ARIA labels)
 * - Use appropriate gap values for your design
 *
 * Browser support:
 *
 * - Modern browsers with IntersectionObserver support
 * - Touch events support for mobile devices
 * - CSS transforms and transitions
 *
 * @author Andrey Shpigunov
 * @version 0.3
 * @since 2025-07-18
 */

import { lib } from './lib';

export class Slider {
  constructor() {
    /**
     * NodeList of all slider elements.
     * @type {NodeListOf<HTMLElement>}
     */
    this.sliders = [];

    /**
     * Map of slider instances with their event handlers and data.
     * Key: HTMLElement, Value: { wrapper, slides, events, touch, listenerTarget }
     * @type {Map<HTMLElement, Object>}
     */
    this.instances = new Map();

    /**
     * IntersectionObserver instance for lazy initialization.
     * @type {IntersectionObserver|null}
     */
    this.io = null;

    /**
     * MutationObserver instance for dynamic content.
     * @type {MutationObserver|null}
     */
    this.mo = null;
  }

  init() {
    this.observeSliders();

    if (!('MutationObserver' in window)) {
      console.warn('slider: MutationObserver is not supported');
      return;
    }

    this.mo = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && node instanceof HTMLElement) {
            if (node.hasAttribute('x-slider') && this.io) {
              this.io.observe(node);
            }
            const sliders = node.querySelectorAll?.('[x-slider]');
            if (sliders && this.io) {
              for (const slider of sliders) {
                if (slider && !this.instances.has(slider)) {
                  this.io.observe(slider);
                }
              }
            }
          }
        }
      }
    });
    this.mo.observe(document.body, { childList: true, subtree: true });
  }

  destroy() {
    this.instances.forEach((data, el) => {
      const target = data.listenerTarget || data.wrapper || el;
      if (data.touch) {
        target.removeEventListener('touchstart', data.events.touchstart, true);
        target.removeEventListener('touchmove',  data.events.touchmove,  true);
        target.removeEventListener('touchend',   data.events.touchend,   true);
        target.removeEventListener('touchcancel',data.events.touchcancel,true);
      } else {
        el.removeEventListener('mousemove', data.events.mousemove);
        if (data.events.mouseout) el.removeEventListener('mouseleave', data.events.mouseout);
        if (data.events.mouseenter) el.removeEventListener('mouseenter', data.events.mouseenter);
        if (data.events.resize) {
          window.removeEventListener('resize', data.events.resize);
          window.removeEventListener('orientationchange', data.events.resize);
        }
      }
    });
    if (this.io) this.io.disconnect();
    if (this.mo) this.mo.disconnect();
    this.instances.clear();
  }

  observeSliders() {
    if (!('IntersectionObserver' in window)) {
      console.warn('slider: IntersectionObserver is not supported');
      return;
    }

    this.sliders = document.querySelectorAll('[x-slider]');
    this.io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.target && !this.instances.has(entry.target)) {
          this.initSlider(entry.target);
        }
      }
    }, { rootMargin: '60px 0px 60px 0px', threshold: 0 });

    for (const slider of this.sliders) {
      if (slider) {
        this.io.observe(slider);
      }
    }
  }

  /**
   * Validates slider configuration values.
   * @param {Object} config - Configuration object
   * @returns {Object} - Validated configuration
   * @private
   */
  _validateConfig(config) {
    const validated = {
      gap: 0,
      rubber: true,
      resetOnMouseout: true,
      touch: true
    };

    if (!config || typeof config !== 'object') {
      return validated;
    }

    if ('gap' in config) {
      const gapValue = Number(config.gap);
      validated.gap = isNaN(gapValue) || gapValue < 0 ? 0 : gapValue;
    }

    if ('rubber' in config) {
      validated.rubber = Boolean(config.rubber);
    }

    if ('resetOnMouseout' in config) {
      validated.resetOnMouseout = Boolean(config.resetOnMouseout);
    }

    if ('touch' in config) {
      validated.touch = Boolean(config.touch);
    }

    return validated;
  }

  /**
   * Initializes a single slider instance.
   * SECURITY: Validates configuration before use.
   * @param {HTMLElement} el - Slider container element
   * @private
   */
  initSlider(el) {
    if (!el || !(el instanceof HTMLElement)) {
      console.error('slider.initSlider: Invalid element');
      return;
    }

    const rawSlides = [...el.children].map(node => node.cloneNode(true));
    if (!rawSlides.length) {
      console.warn('slider.initSlider: No slides found', el);
      return;
    }

    el.classList.add('slider');
    el.style.overflow = 'hidden';
    el.style.overscrollBehavior = 'contain';

    let gap = 0, rubber = true, resetOnMouseout = true, touch = true;
    try {
      const configAttr = el.getAttribute('x-slider');
      if (configAttr) {
        if (!lib.isValidJSON(configAttr)) {
          console.warn('slider.initSlider: Invalid JSON in x-slider attribute:', configAttr);
        } else {
          const parsed = JSON.parse(configAttr);
          const validated = this._validateConfig(parsed);
          gap = validated.gap;
          rubber = validated.rubber;
          resetOnMouseout = validated.resetOnMouseout;
          touch = validated.touch;
        }
      }
    } catch (err) {
      console.warn('slider.initSlider: Error parsing x-slider JSON', err);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'slider-wrapper';
    wrapper.style.gap = gap + 'px';
    el.innerHTML = '';

    // Prepare slides
    for (let i = 0; i < rawSlides.length; i++) {
      const node = rawSlides[i];
      if (!node) continue;

      node.classList.add('slider-item');
      const img = node.querySelector('img');
      if (img && i === 0) {
        // First slide loads immediately
        if (img.dataset.srcset) {
          img.srcset = img.dataset.srcset;
          img.removeAttribute('data-srcset');
        }
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        img.setAttribute('loading', 'eager');
      }
      wrapper.appendChild(node);
    }

    el.appendChild(wrapper);

    const isTouch = 'ontouchstart' in window;
    let indicators = [];

    // Indicators
    if (rawSlides.length > 1 && (!isTouch || touch)) {
      const indicatorsContainer = document.createElement('div');
      indicatorsContainer.className = 'slider-indicators';
      for (let i = 0; i < rawSlides.length; i++) {
        const span = document.createElement('span');
        if (i === 0) span.classList.add('active');
        indicatorsContainer.appendChild(span);
      }
      el.appendChild(indicatorsContainer);
      indicators = [...indicatorsContainer.querySelectorAll('span')];
    }

    const slides = rawSlides;
    // manage touch-action via class so stylesheet can control behavior
    if (isTouch && touch) {
      el.classList.add('slider_touch');
    } else {
      el.classList.remove('slider_touch');
    }

    if (isTouch && !touch) {
      // Touch interactions for sliding are disabled by config.
      // Do not attach slider touch handlers; other handlers should receive touch events.
      slides[0].classList.add('active');
      return;
    }

    let current = 0;
    const isiOS = /iP(ad|hone|od)/.test(navigator.platform) ||
                  (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

    const updateSlideWidth = () => slides[0].offsetWidth + gap;

    const setSlide = (i, instant = false) => {
      const targetIndex = Math.max(0, Math.min(i, slides.length - 1));
      const slideWidth = updateSlideWidth();
      current = targetIndex;

      wrapper.style.transition = instant ? 'none' : 'transform 0.25s';
      wrapper.style.transform = `translateX(${-current * slideWidth}px)`;

      if (indicators.length) {
        for (let idx = 0; idx < indicators.length; idx++) {
          const span = indicators[idx];
          if (span) {
            span.classList.toggle('active', idx === current);
          }
        }
      }

      if (!instant) {
        wrapper.addEventListener('transitionend', () => {
          wrapper.style.transition = 'none';
          if (isiOS) {
            wrapper.style.pointerEvents = 'none';
            requestAnimationFrame(() => {
              void wrapper.offsetWidth;
              wrapper.style.pointerEvents = 'auto';
            });
          }
        }, { once: true });
      }
    };

    setSlide(0, true);

    const events = {};
    let allLoaded = false;
    let cursorX = null;

    const loadAllImages = () => {
      if (allLoaded) return;
      allLoaded = true;

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        if (!slide) continue;

        const img = slide.querySelector('img');
        if (!img || i === 0) continue; // first already loaded

        if (img.dataset.srcset) {
          img.srcset = img.dataset.srcset;
          img.removeAttribute('data-srcset');
        }
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }

        if (!isTouch && (!img.complete || img.naturalWidth === 0)) {
          img.addEventListener('load', () => {
            if (cursorX != null) {
              const rect = el.getBoundingClientRect();
              const w = el.offsetWidth;
              if (w > 0) {
                const idx = Math.floor(((cursorX - rect.left) / w) * slides.length);
                if (idx === i) setSlide(i, true);
              }
            }
          }, { once: true });
        }
      }
    };

    if (slides.length > 1) {
      if (isTouch) {
        // --- Touch ---
        let startX = 0, startY = 0, moving = false, activeId = null;
        const findTouchById = (list, id) => [...list].find(t => t.identifier === id) || null;

        const firstTouch = () => {
          loadAllImages();
          el.removeEventListener('touchstart', firstTouch);
        };
        el.addEventListener('touchstart', firstTouch, { passive:false, capture:true });

        events.touchstart = e => {
          const t = e.changedTouches[0];
          activeId = t.identifier;
          startX = t.clientX;
          startY = t.clientY;
          moving = true;
          wrapper.style.transition = 'none';
        };
        events.touchmove = e => {
          if (!moving || activeId == null) return;
          const t = findTouchById(e.touches, activeId);
          if (!t) return;

          const dx = t.clientX - startX;
          const dy = t.clientY - startY;
          if (Math.abs(dy) > Math.abs(dx)) return;
          if (e.cancelable) e.preventDefault();

          const slideWidth = updateSlideWidth();
          let effDx = dx;
          if (current === 0 && dx > 0) effDx = rubber ? dx*0.15 : 0;
          if (current === slides.length-1 && dx < 0) effDx = rubber ? dx*0.15 : 0;

          wrapper.style.transform = `translateX(${-current*slideWidth + effDx}px)`;
        };
        events.touchend = e => {
          if (!moving) return;
          moving = false;
          const t = findTouchById(e.changedTouches, activeId) || e.changedTouches[0];
          activeId = null;

          const dx = t.clientX - startX;
          const dy = t.clientY - startY;
          const slideWidth = updateSlideWidth();
          const THRESHOLD = slideWidth*0.1;

          if (Math.abs(dy) > Math.abs(dx)) { setSlide(current); return; }
          if ((current === 0 && dx>0) || (current===slides.length-1 && dx<0)) { setSlide(current); return; }
          if (dx>THRESHOLD && current>0) setSlide(current-1);
          else if (dx<-THRESHOLD && current<slides.length-1) setSlide(current+1);
          else setSlide(current);
        };
        events.touchcancel = () => { moving=false; activeId=null; setSlide(current); };

        el.addEventListener('touchstart', events.touchstart, { passive:false, capture:true });
        el.addEventListener('touchmove',  events.touchmove,  { passive:false, capture:true });
        el.addEventListener('touchend',   events.touchend,   { capture:true });
        el.addEventListener('touchcancel',events.touchcancel,{ capture:true });

      } else {
        // --- Desktop ---
        const firstHover = e => {
          cursorX = e.clientX;
          loadAllImages();
          el.removeEventListener('mouseenter', firstHover);
        };
        el.addEventListener('mouseenter', firstHover);

        events.mousemove = e => {
          cursorX = e.clientX;
          const rect = el.getBoundingClientRect();
          const w = el.offsetWidth;
          if (w <= 0) return;
          let x = e.clientX - rect.left;
          if (x < 0) x = 0; else if (x >= w) x = w-1e-7;
          const idx = Math.floor((x / w) * slides.length);

          const img = slides[idx].querySelector('img');
          if (idx !== current && (!img || img.complete || img.naturalWidth > 0)) {
            setSlide(idx,true);
          }
        };
        el.addEventListener('mousemove', events.mousemove);
        el.addEventListener('mouseenter', e => events.mousemove(e));

        if (resetOnMouseout) {
          events.mouseout = () => setSlide(0,true);
          el.addEventListener('mouseleave', events.mouseout);
        }
      }
    }

    const handleResize = () => {
      const slideWidth = updateSlideWidth();
      wrapper.style.transition = 'none';
      wrapper.style.transform = `translateX(${-current*slideWidth}px)`;
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    events.resize = handleResize;

    this.instances.set(el, { wrapper, slides, events, touch:isTouch, listenerTarget:el });
  }
}

export const slider = new Slider();
