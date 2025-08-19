// slider.js
// A lightweight, dependency-free slider with support for touch and mouse.
// Features: lazy-loading via data-src/data-srcset, configurable gap, auto-init with IntersectionObserver.

// Example usage:
//
// <div x-slider='{"gap": 0}'>
//   <div><img data-src="image1.jpg" alt="Slide 1"></div>
//   <div><img data-src="image2.jpg" alt="Slide 2"></div>
//   <div><img data-src="image3.jpg" alt="Slide 3"></div>
// </div>
//
// <script type="module">
//   import { slider } from './slider.js';
//   slider.init();
// </script>

export class Slider {
  constructor() {
    this.sliders = [];
    this.instances = new Map();
    this.io = null;
    this.mo = null;
  }

  /**
   * Initialize global slider observer
   * - Observes DOM mutations for new [x-slider] elements
   * - Initializes sliders when they enter the viewport
   */
  init() {
    this.observeSliders();

    // Observe dynamically inserted sliders
    this.mo = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.hasAttribute?.('x-slider')) {
            this.io.observe(node);
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
      if (data.touch) {
        data.wrapper.removeEventListener('touchstart', data.events.touchstart);
        data.wrapper.removeEventListener('touchmove', data.events.touchmove);
        data.wrapper.removeEventListener('touchend', data.events.touchend);
      } else {
        el.removeEventListener('mousemove', data.events.mousemove);
      }
    });
    if (this.io) this.io.disconnect();
    if (this.mo) this.mo.disconnect();
    this.instances.clear();
  }

  /**
   * Find all [x-slider] elements and observe them with IntersectionObserver
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
    const rawSlides = [...el.children];
    if (rawSlides.length === 0) return;

    el.classList.add('slider');

    // Read gap from JSON config
    let gap = 0;
    try {
      const config = el.getAttribute('x-slider');
      if (config) {
        const parsed = JSON.parse(config);
        if (parsed.gap) gap = Number(parsed.gap) || 0;
      }
    } catch (err) {
      console.warn('Invalid x-slider JSON', err);
    }

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'slider-wrapper';
    wrapper.style.display = 'flex';
    wrapper.style.gap = gap + 'px';

    // Move slides inside wrapper
    rawSlides.forEach(node => {
      node.classList.add('slider-item');
      wrapper.appendChild(node);
    });

    el.innerHTML = '';
    el.appendChild(wrapper);

    // Create indicators
    let indicators = [];
    if (rawSlides.length > 1) {
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
    const isTouch = 'ontouchstart' in window;
    let current = 0;

    // Get slide width (including gap)
    const updateSlideWidth = () => slides[0].offsetWidth + gap;

    // Lazy-load slide images
    const loadSlide = i => {
      [i - 1, i, i + 1].forEach(idx => {
        if (idx >= 0 && idx < slides.length) {
          const img = slides[idx].querySelector('img');
          if (!img) return;

          if (img.dataset.src && !img.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }

          if (img.dataset.srcset && !img.srcset) {
            img.srcset = img.dataset.srcset;
            img.removeAttribute('data-srcset');
          }
        }
      });
    };

    // Set active slide
    const setSlide = (i, instant = false) => {
      current = Math.max(0, Math.min(i, slides.length - 1));
      const slideWidth = updateSlideWidth();
      wrapper.style.transition = instant ? 'none' : 'transform 0.25s ease-out';
      wrapper.style.transform = `translateX(${-current * slideWidth}px)`;
      loadSlide(current);
      if (indicators.length) {
        indicators.forEach((span, idx) => span.classList.toggle('active', idx === current));
      }
    };

    setSlide(0, true);

    const events = {};

    // Touch or mouse behavior
    if (slides.length > 1) {
      if (isTouch) {
        let startX = 0, startY = 0, moving = false;

        events.touchstart = e => {
          const t = e.touches[0];
          startX = t.clientX;
          startY = t.clientY;
          moving = true;
          wrapper.style.transition = 'none';
        };

        events.touchmove = e => {
          if (!moving) return;
          const x = e.touches[0].clientX;
          const dx = x - startX;
          const dy = e.touches[0].clientY - startY;
        
          // Vertical scroll detection
          if (Math.abs(dy) > Math.abs(dx)) return;
        
          const slideWidth = updateSlideWidth();
          
          // Ограничиваем движение на краях
          let offset = -current * slideWidth + dx;
          if (current === 0 && dx > 0) {
            offset = -current * slideWidth + dx * 0.1; // небольшой "резиновый" отскок
          } else if (current === slides.length - 1 && dx < 0) {
            offset = -current * slideWidth + dx * 0.1;
          }
        
          wrapper.style.transform = `translateX(${offset}px)`;
          e.preventDefault(); // prevent vertical scroll during horizontal swipe
        };

        events.touchend = e => {
          if (!moving) return;
          moving = false;
          const dx = e.changedTouches[0].clientX - startX;
          const dy = e.changedTouches[0].clientY - startY;
          if (Math.abs(dy) > Math.abs(dx)) {
            setSlide(current);
            return;
          }

          const THRESHOLD = 50;
          if (dx > THRESHOLD && current > 0) setSlide(current - 1);
          else if (dx < -THRESHOLD && current < slides.length - 1) setSlide(current + 1);
          else setSlide(current);
        };

        wrapper.addEventListener('touchstart', events.touchstart);
        wrapper.addEventListener('touchmove', events.touchmove, { passive: false });
        wrapper.addEventListener('touchend', events.touchend);
      } else {
        // Desktop hover navigation
        events.mousemove = e => {
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const sectionWidth = rect.width / slides.length;
          const idx = Math.floor(x / sectionWidth);
          if (idx !== current) setSlide(idx, true);
        };
        el.addEventListener('mousemove', events.mousemove);
      }
    }

    this.instances.set(el, { wrapper, slides, events, touch: isTouch });
  }
}

export const slider = new Slider();
