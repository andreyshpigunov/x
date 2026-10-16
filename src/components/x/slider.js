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
 *    - Existing slide nodes are moved and restored on destroy; event listeners are preserved
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
 * @example
 * // Vanilla JS — plain HTML
 * // index.html:
 * // <div x-slider='{"gap":16,"rubber":true,"resetOnMouseout":true,"touch":true}'>
 * //   <div><img data-src="slide1.jpg" alt="Slide 1"></div>
 * //   <div><img data-src="slide2.jpg" alt="Slide 2"></div>
 * //   <div><img data-src="slide3.jpg" alt="Slide 3"></div>
 * // </div>
 * //
 * // <script type="module">
 * //   import { slider } from './src/components/x/slider.js';
 * //   window.addEventListener('DOMContentLoaded', () => slider.init());
 * //   window.addEventListener('pagehide', () => slider.destroy());
 * // </script>
 *
 * @author Andrey Shpigunov
 * @version 0.3
 * @since 2025-07-18
 */

import { lib } from './lib.js';

export class Slider {
  constructor() {
    /**
     * NodeList of all slider elements.
     * @type {NodeListOf<HTMLElement>}
     */
    this.sliders = [];
    this._observed = new Set();

    /**
     * Map of slider instances with their event handlers and data.
     * Key: HTMLElement, Value: { wrapper, slides, events, touch, listenerTarget }
     * @type {Map<HTMLElement, Object>}
     */
    this.instances = new Map();
    this._originalStates = new Map();

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

    this._initialized = false;
  }

  init() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    this.observeSliders();
    if (this._initialized) return;

    if (!('MutationObserver' in window)) {
      console.warn('slider: MutationObserver is not supported');
      this._initialized = true;
      return;
    }

    const observer = new MutationObserver(mutations => {
      if (this.mo !== observer) return;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && node instanceof HTMLElement) {
            if (node.hasAttribute('x-slider') && this.io) {
              this._observe(node);
            }
            const sliders = node.querySelectorAll?.('[x-slider]');
            if (sliders && this.io) {
              for (const slider of sliders) {
                if (slider && !this.instances.has(slider)) {
                  this._observe(slider);
                }
              }
            }
          }
        }
      }
      this.sliders = Array.from(this.sliders).filter(el => el.isConnected);
      for (const element of new Set([...this._observed, ...this._originalStates.keys()])) {
        if (!element.isConnected) this._destroySlider(element);
      }
    });
    this.mo = observer;
    this.mo.observe(document.body, { childList: true, subtree: true });
    this._initialized = true;
  }

  _destroySlider(el) {
    const data = this.instances.get(el);
    if (data) {
      const target = data.listenerTarget || data.wrapper || el;
      for (const name of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
        if (data.events[name]) target.removeEventListener(name, data.events[name], true);
      }
      if (data.events.firstTouch) el.removeEventListener('touchstart', data.events.firstTouch, true);
      for (const [name, type] of [['mousemove','mousemove'], ['firstHover','mouseenter'], ['mouseout','mouseleave'], ['mouseenter','mouseenter']]) {
        if (data.events[name]) el.removeEventListener(type, data.events[name]);
      }
      if (data.events.resize) {
        window.removeEventListener('resize', data.events.resize);
        window.removeEventListener('orientationchange', data.events.resize);
      }
    }
    const state = this._originalStates.get(el);
    if (state) {
      state.active = false;
      for (const cleanup of state.cleanups) cleanup();
      for (const frame of state.frames) cancelAnimationFrame(frame);
      el.replaceChildren(...state.nodes);
      for (const [node, item, active] of state.classes) {
        node.classList.toggle('slider-item', item);
        node.classList.toggle('active', active);
      }
      el.classList.toggle('slider', state.slider);
      el.classList.toggle('slider_touch', state.touch);
      el.style.overflow = state.overflow;
      el.style.overscrollBehavior = state.overscrollBehavior;
    }
    this._unobserve(el);
    this._originalStates.delete(el);
    this.instances.delete(el);
  }

  destroy() {
    if (typeof window === 'undefined') return;
    this.io?.disconnect();
    this._observed.clear();
    this.mo?.disconnect();
    for (const el of new Set([...this.instances.keys(), ...this._originalStates.keys()])) this._destroySlider(el);
    this.io = null;
    this.mo = null;
    this.sliders = [];
    this._initialized = false;
  }

  _observe(el) {
    if (!this.io || this._observed.has(el) || this._originalStates.has(el)) return;
    this._observed.add(el);
    this.io.observe(el);
  }

  _unobserve(el) {
    this.io?.unobserve(el);
    this._observed.delete(el);
  }

  observeSliders() {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !('IntersectionObserver' in window)) return;
    if (!this.io) {
      const observer = new IntersectionObserver(entries => {
        if (this.io !== observer) return;
        for (const entry of entries) {
          if (entry.isIntersecting && this._observed.has(entry.target) && entry.target.isConnected !== false && !this._originalStates.has(entry.target)) this.initSlider(entry.target);
        }
      }, { rootMargin: '60px 0px 60px 0px', threshold: 0 });
      this.io = observer;
    }
    this.sliders = document.querySelectorAll('[x-slider]');
    for (const element of this.sliders) {
      if (!this._originalStates.has(element)) this._observe(element);
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
      validated.gap = !Number.isFinite(gapValue) || gapValue < 0 ? 0 : gapValue;
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

    if (this._originalStates.has(el)) return;
    const rawSlides = [...el.children];
    if (!rawSlides.length) {
      console.warn('slider.initSlider: No slides found', el);
      return;
    }

    // A single slide does not need slider behavior. Keep the original DOM so
    // horizontal gestures can be handled by a parent scroller, but activate a
    // deferred image just as the regular initialization path would.
    this._originalStates.set(el, {
      nodes: Array.from(el.childNodes),
      classes: rawSlides.map(node => [node, node.classList.contains('slider-item'), node.classList.contains('active')]),
      active: true, cleanups: new Set(), frames: new Set(),
      slider: el.classList.contains('slider'),
      touch: el.classList.contains('slider_touch'),
      overflow: el.style.overflow,
      overscrollBehavior: el.style.overscrollBehavior
    });

    const state = this._originalStates.get(el);
    if (rawSlides.length === 1) {
      const slide = el.firstElementChild;
      const img = slide?.querySelector('img');

      slide?.classList.add('slider-item', 'active');
      if (img?.dataset.srcset) {
        img.srcset = img.dataset.srcset;
        img.removeAttribute('data-srcset');
      }
      if (img?.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
      if (img) img.setAttribute('loading', 'eager');

      this._unobserve(el);
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
      this._unobserve(el);
      return;
    }

    let current = 0;
    const isiOS = /iP(ad|hone|od)/.test(navigator.platform) ||
                  (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

    const updateSlideWidth = () => slides[0].offsetWidth + gap;

    let cancelTransition = null;
    const setSlide = (i, instant = false) => {
      cancelTransition?.();
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
        const onTransitionEnd = event => {
          if (event.target !== wrapper || event.propertyName !== 'transform') return;
          cancelTransition?.();
          if (!state.active) return;
          wrapper.style.transition = 'none';
          if (isiOS) {
            wrapper.style.pointerEvents = 'none';
            const frame = requestAnimationFrame(() => {
              state.frames.delete(frame);
              if (!state.active) return;
              void wrapper.offsetWidth;
              wrapper.style.pointerEvents = 'auto';
            });
            state.frames.add(frame);
          }
        };
        const cleanup = () => {
          wrapper.removeEventListener('transitionend', onTransitionEnd);
          state.cleanups.delete(cleanup);
          cancelTransition = null;
        };
        cancelTransition = cleanup;
        wrapper.addEventListener('transitionend', onTransitionEnd);
        state.cleanups.add(cleanup);
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
          const cleanup = () => {
            img.removeEventListener('load', onLoad);
            state.cleanups.delete(cleanup);
          };
          const onLoad = () => {
            cleanup();
            if (!state.active) return;
            if (cursorX != null) {
              const rect = el.getBoundingClientRect();
              const w = el.offsetWidth;
              if (w > 0) {
                const idx = Math.floor(((cursorX - rect.left) / w) * slides.length);
                if (idx === i) setSlide(i, true);
              }
            }
          };
          img.addEventListener('load', onLoad, { once: true });
          state.cleanups.add(cleanup);
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
          el.removeEventListener('touchstart', firstTouch, true);
        };
        events.firstTouch = firstTouch;
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
        events.firstHover = firstHover;
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
        events.mouseenter = e => events.mousemove(e);
        el.addEventListener('mouseenter', events.mouseenter);

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

    this._unobserve(el);
    this.instances.set(el, { wrapper, slides, events, touch:isTouch, listenerTarget:el });
  }
}

export const slider = new Slider();
