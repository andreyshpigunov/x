// Slider.js
export class Slider {
  constructor() {
    this.sliders = [];
    this.instances = new Map();
    this.io = null;
  }

  init() {
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

  destroy() {
    this.instances.forEach((data, el) => {
      if (data.touch) {
        data.wrapper.removeEventListener('touchstart', data.events.touchstart);
      } else {
        el.removeEventListener('mousemove', data.events.mousemove);
      }
    });
    if (this.io) {
      this.io.disconnect();
      this.io = null;
    }
    this.instances.clear();
  }

  initSlider(el) {
    const wrapper = el.querySelector('.slider-wrapper');
    const slides = [...el.querySelectorAll('.slide')];
    const indicatorsContainer = el.querySelector('.slider-indicators');
    const isTouch = 'ontouchstart' in window;
    let current = 0;

    // Создаём индикаторы
    slides.forEach((_, i) => {
      const span = document.createElement('span');
      if (i === 0) span.classList.add('active');
      indicatorsContainer.appendChild(span);
    });
    const indicators = [...indicatorsContainer.querySelectorAll('span')];

    const loadSlide = i => {
      // Подгружаем текущий и соседние слайды
      [i-1, i, i+1].forEach(idx => {
        if (idx >= 0 && idx < slides.length) {
          const img = slides[idx].querySelector('img');
          if (img && img.dataset.src && !img.src) img.src = img.dataset.src;
        }
      });
    };

    const setSlide = i => {
      current = Math.max(0, Math.min(i, slides.length - 1));
      wrapper.style.transform = `translateX(-${current*100}%)`;
      loadSlide(current);
      indicators.forEach((span, idx) => span.classList.toggle('active', idx===current));
    };

    setSlide(0);

    const events = {};

    if (isTouch) {
      let startX = 0, moving = false;
    
      events.touchstart = e => {
        moving = true;
        startX = e.touches[0].clientX;
    
        const onMove = ev => {
          if (!moving) return;
          const x = ev.touches[0].clientX;
          const dx = x - startX;
    
          // Отменяем горизонтальный скролл страницы
          if (Math.abs(dx) > 5) ev.preventDefault();
    
          // Запрет свайпа за крайние слайды
          let move = dx;
          if ((current === 0 && dx > 0) || (current === slides.length - 1 && dx < 0)) move = 0;
    
          wrapper.style.transform = `translateX(${-current*100 + move / el.offsetWidth * 100}%)`;
        };
    
        const onEnd = ev => {
          if (!moving) return;
          moving = false;
          const x = ev.changedTouches[0].clientX;
          const dx = x - startX;
    
          if (dx > 50 && current > 0) setSlide(current - 1);
          else if (dx < -50 && current < slides.length - 1) setSlide(current + 1);
          else setSlide(current);
    
          document.removeEventListener('touchmove', onMove);
          document.removeEventListener('touchend', onEnd);
        };
    
        document.addEventListener('touchmove', onMove, { passive: false }); // важно passive:false
        document.addEventListener('touchend', onEnd);
      };
    
      wrapper.addEventListener('touchstart', events.touchstart);
    } else {
      // Десктоп hover по секциям
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

// Экспорт singleton
export const slider = new Slider();
