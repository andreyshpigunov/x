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
    el.style.overflow = 'hidden';
    el.style.touchAction = 'pan-y';

    // Read config (gap + rubber)
    let gap = 0;
    let rubber = false;
    try {
      const config = el.getAttribute('x-slider');
      if (config) {
        const parsed = JSON.parse(config);
        if (Object.prototype.hasOwnProperty.call(parsed, 'gap')) {
          const g = Number(parsed.gap);
          gap = Number.isFinite(g) ? g : 0;
        }
        if (Object.prototype.hasOwnProperty.call(parsed, 'rubber')) {
          rubber = Boolean(parsed.rubber);
        }
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
      // Clamp index
      current = Math.max(0, Math.min(i, slides.length - 1));
      const slideWidth = updateSlideWidth();
    
      // Apply transition (or skip if instant)
      wrapper.style.transition = instant ? 'none' : 'transform 0.25s ease-out';
      wrapper.style.transform = `translateX(${-current * slideWidth}px)`;
    
      // Lazy-load current and neighbor slides
      loadSlide(current);
    
      // Update indicators
      if (indicators.length) {
        indicators.forEach((span, idx) =>
          span.classList.toggle('active', idx === current)
        );
      }
    
      // iOS Safari fix: reset transition after animation ends
      if (!instant) {
        wrapper.addEventListener(
          'transitionend',
          () => {
            wrapper.style.transition = 'none';
          },
          { once: true }
        );
      }
    };

    setSlide(0, true);

    const events = {};

    // Touch or mouse behavior
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
          if (!t) return; // активный палец ушёл — ждём touchend/cancel
    
          const dx = t.clientX - startX;
          const dy = t.clientY - startY;
    
          // Если движение больше по вертикали — отдаём управление странице
          if (Math.abs(dy) > Math.abs(dx)) return;
    
          // Горизонт: блокируем скролл страницы
          e.preventDefault();
    
          const slideWidth = updateSlideWidth();
    
          // Блок/смягчение на краях
          let effDx = dx;
          if (current === 0 && dx > 0) {
            effDx = rubber ? dx * 0.1 : 0; // наружу влево
          } else if (current === slides.length - 1 && dx < 0) {
            effDx = rubber ? dx * 0.1 : 0; // наружу вправо
          }
    
          const offset = -current * slideWidth + effDx;
          wrapper.style.transform = `translateX(${offset}px)`;
        };
    
        events.touchend = e => {
          if (!moving) return;
          moving = false;
    
          const t = findTouchById(e.changedTouches, activeId) || e.changedTouches[0];
          activeId = null;
    
          const dx = t.clientX - startX;
          const dy = t.clientY - startY;
    
          // Вертикальный жест — откат
          if (Math.abs(dy) > Math.abs(dx)) {
            setSlide(current);
            return;
          }
    
          const slideWidth = updateSlideWidth();
          const THRESHOLD = slideWidth * 0.2;
    
          // Наружу на краях — всегда откат
          if ((current === 0 && dx > 0) || (current === slides.length - 1 && dx < 0)) {
            setSlide(current);
            return;
          }
    
          if (dx > THRESHOLD && current > 0) setSlide(current - 1);
          else if (dx < -THRESHOLD && current < slides.length - 1) setSlide(current + 1);
          else setSlide(current);
        };
    
        events.touchcancel = () => {
          moving = false;
          activeId = null;
          setSlide(current);
        };
    
        wrapper.addEventListener('touchstart', events.touchstart, { passive: false });
        wrapper.addEventListener('touchmove', events.touchmove, { passive: false });
        wrapper.addEventListener('touchend', events.touchend);
        wrapper.addEventListener('touchcancel', events.touchcancel);
      } else {
        // Desktop hover navigation (как было)
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
