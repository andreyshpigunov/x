// slider.js
// Lightweight, dependency-free slider with touch and mouse support.
// Deferred image loading:
// - First slide loads immediately
// - Other slides load only on first interaction (hover on desktop, touchstart on touch devices)
//
// Example usage:
//
// <div x-slider='{"gap":0,"rubber":true,"resetOnMouseout":true,"touch":true}'>
//   <div><img data-src="image1.jpg" data-srcset="..." alt="Slide 1"></div>
//   <div><img data-src="image2.jpg" data-srcset="..." alt="Slide 2"></div>
//   <div><img data-src="image3.jpg" alt="Slide 3"></div>
// </div>
//
// <script type="module">
//   import { slider } from './slider.js';
//   slider.init();
// </script>
//

export class Slider {
  constructor() {
    this.sliders = [];
    this.instances = new Map();
    this.io = null;
    this.mo = null;
  }

  init() {
    this.observeSliders();

    this.mo = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.hasAttribute?.('x-slider')) {
            this.io.observe(node);
          }
          if (node.nodeType === 1) {
            node.querySelectorAll?.('[x-slider]')?.forEach(n => this.io.observe(n));
          }
        });
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
    this.sliders = document.querySelectorAll('[x-slider]');
    this.io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.instances.has(entry.target)) {
          this.initSlider(entry.target);
        }
      });
    }, { rootMargin: '60px 0px 60px 0px', threshold: 0 });

    this.sliders.forEach(slider => this.io.observe(slider));
  }

  initSlider(el) {
    const rawSlides = [...el.children].map(node => node.cloneNode(true));
    if (!rawSlides.length) return;

    el.classList.add('slider');
    el.style.overflow = 'hidden';
    el.style.touchAction = 'pan-y';
    el.style.overscrollBehavior = 'contain';

    let gap = 0, rubber = true, resetOnMouseout = true, touch = true;
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

    const wrapper = document.createElement('div');
    wrapper.className = 'slider-wrapper';
    wrapper.style.gap = gap + 'px';
    el.innerHTML = '';

    // Prepare slides
    rawSlides.forEach((node, i) => {
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
        img.setAttribute('loading','eager');
      }
      wrapper.appendChild(node);
    });

    el.appendChild(wrapper);

    const isTouch = 'ontouchstart' in window;
    let indicators = [];

    // Indicators
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
        indicators.forEach((span, idx) => span.classList.toggle('active', idx === current));
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

      slides.forEach((slide, i) => {
        const img = slide.querySelector('img');
        if (!img) return;
        if (i === 0) return; // first already loaded

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
              const idx = Math.floor(((cursorX - rect.left)/w) * slides.length);
              if (idx === i) setSlide(i, true);
            }
          }, { once: true });
        }
      });
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
