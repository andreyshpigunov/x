// Slider.js
export class Slider {
  constructor() {
    this.sliders = [];
    this.instances = new Map();
    this.io = null;
    this.mo = null; // MutationObserver
  }

  init() {
    this.observeSliders();

    // MutationObserver для динамических вставок
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

  destroy() {
    this.instances.forEach((data, el) => {
      if (data.touch) {
        data.wrapper.removeEventListener('touchstart', data.events.touchstart);
        data.wrapper.removeEventListener('touchend', data.events.touchend);
      } else {
        el.removeEventListener('mousemove', data.events.mousemove);
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
    }, { threshold: 0.1 });
    this.sliders.forEach(slider => this.io.observe(slider));
  }

  initSlider(el) {
    const wrapper = el.querySelector('.slider-wrapper');
    const slides = [...el.querySelectorAll('.slide')];
    const indicatorsContainer = el.querySelector('.slider-indicators');
    const isTouch = 'ontouchstart' in window;
    let current = 0;

    // Индикаторы
    slides.forEach((_, i) => {
      const span = document.createElement('span');
      if (i === 0) span.classList.add('active');
      indicatorsContainer.appendChild(span);
    });
    const indicators = [...indicatorsContainer.querySelectorAll('span')];

    const loadSlide = i => {
      [i - 1, i, i + 1].forEach(idx => {
        if (idx >= 0 && idx < slides.length) {
          const img = slides[idx].querySelector('img');
          if (img && img.dataset.src && !img.src) img.src = img.dataset.src;
        }
      });
    };

    const setSlide = i => {
      current = Math.max(0, Math.min(i, slides.length - 1));
      wrapper.style.transition = 'transform 0.3s ease-out';
      wrapper.style.transform = `translateX(-${current * 100}%)`;
      loadSlide(current);
      indicators.forEach((span, idx) => span.classList.toggle('active', idx === current));
    };

    setSlide(0);

    const events = {};

    if (isTouch) {
      let startX = 0, startY = 0, isMoving = false;

      events.touchstart = e => {
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        isMoving = true;
      };

      events.touchend = e => {
        if (!isMoving) return;
        isMoving = false;

        const t = e.changedTouches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;

        // Игнорируем вертикальные свайпы
        if (Math.abs(dy) > Math.abs(dx)) return;

        const THRESHOLD = 50; // px
        if (dx > THRESHOLD && current > 0) {
          setSlide(current - 1);
        } else if (dx < -THRESHOLD && current < slides.length - 1) {
          setSlide(current + 1);
        }
      };

      wrapper.addEventListener('touchstart', events.touchstart);
      wrapper.addEventListener('touchend', events.touchend);
    } else {
      // Навигация мышью по секторам
      events.mousemove = e => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const sectionWidth = rect.width / slides.length;
        const idx = Math.floor(x / sectionWidth);
        if (idx !== current) setSlide(idx);
      };
      el.addEventListener('mousemove', events.mousemove);
    }

    this.instances.set(el, { wrapper, slides, events, touch: isTouch });
  }
}

export const slider = new Slider();
