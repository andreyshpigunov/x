// slider.js
// Lightweight, dependency-free slider with touch and mouse support.
// Uses native lazy-loading via loading="lazy" and removes manual primeLazy/loadSlide logic.
// Designed for modern browsers (no old Safari/IE support).

/*
Example usage:

<div x-slider='{"gap":0,"rubber":false,"touch":true}'>
  <div><img src="image1.jpg" srcset="..." alt="Slide 1"></div>
  <div><img src="image2.jpg" alt="Slide 2"></div>
  <div><img src="image3.jpg" alt="Slide 3"></div>
</div>

<script type="module">
  import { slider } from './slider.js';
  slider.init();
</script>
*/

export class Slider {
  constructor() {
    this.sliders = [];
    this.instances = new Map();
    this.io = null;
    this.mo = null;
  }

  /**
   * Initialize all sliders and set up observers for dynamically added sliders
   */
  init() {
    this.observeSliders();

    // Observe DOM mutations to catch newly added sliders
    this.mo = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.hasAttribute?.('x-slider')) {
            this.io.observe(node);
          }
          // Also check for nested sliders inside added subtree
          if (node.nodeType === 1) {
            node.querySelectorAll?.('[x-slider]')?.forEach(n => this.io.observe(n));
          }
        });
      }
    });
    this.mo.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Destroy all slider instances and disconnect observers
   */
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

  /**
   * Find all [x-slider] elements in DOM and observe them via IntersectionObserver
   */
  observeSliders() {
    this.sliders = document.querySelectorAll('[x-slider]');
    this.io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.instances.has(entry.target)) {
          this.initSlider(entry.target);
        }
      });
    }, { threshold: 0.1 });

    this.sliders.forEach(slider => this.io.observe(slider));
  }

  /**
   * Initialize a single slider instance
   * @param {HTMLElement} el
   */
  initSlider(el) {
    const rawSlides = [...el.children].map(node => node.cloneNode(true));
    if (!rawSlides.length) return;

    el.classList.add('slider');
    el.style.overflow = 'hidden';
    el.style.touchAction = 'pan-y';
    el.style.overscrollBehavior = 'contain'; // iOS touch behavior fix

    // Read configuration from x-slider attribute
    let gap = 0, rubber = true, resetOnMouseout = false, touch = true;
    try {
      const config = el.getAttribute('x-slider');
      if (config) {
        const parsed = JSON.parse(config);
        if ('gap' in parsed) gap = Number(parsed.gap) || 0;
        if ('rubber' in parsed) rubber = Boolean(parsed.rubber);
        if ('resetOnMouseout' in parsed) resetOnMouseout = Boolean(parsed.resetOnMouseout);
        if ('touch' in parsed) touch = Boolean(parsed.touch);
      }
    } catch (err) {
      console.warn('Invalid x-slider JSON', err);
    }

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'slider-wrapper';
    wrapper.style.gap = gap + 'px';

    // Clear container
    el.innerHTML = '';

    // Move slides into wrapper and set lazy-loading
    rawSlides.forEach(node => {
      node.classList.add('slider-item');
      const img = node.querySelector('img');
      if (img) img.setAttribute('loading', 'lazy'); // native lazy-load
      // Prioritize first slide
      if(node === rawSlides[0]) img.setAttribute('fetchpriority','high');
      wrapper.appendChild(node);
    });

    // Append wrapper to container
    el.appendChild(wrapper);

    const isTouch = 'ontouchstart' in window;

    // Create indicators (only for non-touch or enabled touch)
    let indicators = [];
    if (rawSlides.length > 1 && (!isTouch || touch)) {
      const indicatorsContainer = document.createElement('div');
      indicatorsContainer.className = 'slider-indicators';
      rawSlides.forEach((_, i) => {
        const span = document.createElement('span');
        if (i === 0) span.classList.add('active');
        indicatorsContainer.appendChild(span);
      });
      el.appendChild(indicatorsContainer);
      indicators = [...indicatorsContainer.querySelectorAll('span')];
    }

    const slides = rawSlides;
    if (isTouch && !touch) {
      // Show first slide only
      slides[0].classList.add('active');
      return;
    }

    let current = 0;
    const isiOS = /iP(ad|hone|od)/.test(navigator.platform) ||
                   (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

    // Get slide width including gap
    const updateSlideWidth = () => slides[0].offsetWidth + gap;

    // Set active slide
    const setSlide = (i, instant = false) => {
      const targetIndex = Math.max(0, Math.min(i, slides.length - 1));
      const slideWidth = updateSlideWidth();
      const targetSlide = slides[targetIndex];

      current = targetIndex;
      wrapper.style.transition = instant ? 'none' : 'transform 0.25s';
      wrapper.style.transform = `translateX(${-current * slideWidth}px)`;

      // Update indicators
      if (indicators.length) {
        indicators.forEach((span, idx) => span.classList.toggle('active', idx === current));
      }

      // iOS Safari fix
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

    // Initialize first slide
    setSlide(0, true);

    const events = {};

    // Touch behavior
    if (slides.length > 1) {
      if (isTouch) {
        let startX = 0, startY = 0, moving = false, activeId = null;
        const findTouchById = (list, id) => {
          for (let i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i];
          return null;
        };

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
          if (Math.abs(dy) > Math.abs(dx)) return; // vertical swipe

          if (e.cancelable) e.preventDefault();

          const slideWidth = updateSlideWidth();
          let effDx = dx;
          if (current === 0 && dx > 0) effDx = rubber ? dx*0.1 : 0;
          if (current === slides.length-1 && dx < 0) effDx = rubber ? dx*0.1 : 0;

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
          const THRESHOLD = slideWidth*0.2;

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
        // Desktop hover navigation
        events.mousemove = e => {
          const rect = el.getBoundingClientRect();
          let w = Math.round(el.offsetWidth);
          if (w <= 0) return;
          let x = e.clientX - rect.left;
          if (x<0) x=0; else if (x>=w) x=w-1e-7;
          const idx = Math.floor((x / w) * slides.length);
          if (idx!==current) setSlide(idx,true);
        };
        el.addEventListener('mousemove', events.mousemove);

        events.mouseenter = e => { events.mousemove(e); };
        el.addEventListener('mouseenter', events.mouseenter);

        if (resetOnMouseout) {
          events.mouseout = () => setSlide(0,true);
          el.addEventListener('mouseleave', events.mouseout);
        }
      }
    }

    // Resize handling
    const handleResize = () => {
      const slideWidth = updateSlideWidth();
      wrapper.style.transition = 'none';
      wrapper.style.transform = `translateX(${-current*slideWidth}px)`;
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    events.resize = handleResize;

    // Save instance for later destroy
    this.instances.set(el, { wrapper, slides, events, touch:isTouch, listenerTarget:el });
  }
}

// Export singleton instance
export const slider = new Slider();
