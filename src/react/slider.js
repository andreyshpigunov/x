'use client';
import { Children, createElement as h, useRef, useState } from 'react';
import { useControllable } from './shared.js';

export function Slider({ children, value, defaultValue = 0, onValueChange, gap = 0, rubber = true,
  resetOnMouseout = true, touch = true, label = 'Слайды', className = '', style }) {
  const slides = Children.toArray(children);
  const [selected, select] = useControllable(value, defaultValue, onValueChange);
  const current = Math.max(0, Math.min(selected, slides.length - 1));
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null), moved = useRef(false);
  const count = slides.length;
  const choose = index => { if (count) select(Math.max(0, Math.min(index, count - 1))); };
  const finish = (event, cancelled = false) => {
    const state = drag.current;
    if (!state || event.pointerId !== state.id) return;
    const dx = event.clientX - state.x, dy = event.clientY - state.y;
    if (!cancelled && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > state.width * .1) choose(current + (dx < 0 ? 1 : -1));
    drag.current = null; setOffset(0); setDragging(false);
  };
  return h('div', { className: `x-react-slider${touch && count > 1 ? ' x-react-slider_touch' : ''} ${className}`.trim(),
    style, role: 'region', 'aria-roledescription': 'carousel', 'aria-label': label, tabIndex: 0,
    onKeyDown: event => {
      if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); choose(event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : current + (event.key === 'ArrowRight' ? 1 : -1));
    },
    onPointerDown: event => {
      if (!touch || count < 2 || event.pointerType === 'mouse' || !event.isPrimary) return;
      moved.current = false;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, width: event.currentTarget.clientWidth + gap };
    },
    onPointerMove: event => {
      if (event.pointerType === 'mouse') {
        if (event.target.closest('button, input, select, textarea')) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (rect.width) choose(Math.floor((event.clientX - rect.left) / rect.width * count));
        return;
      }
      const state = drag.current;
      if (!state || state.id !== event.pointerId) return;
      const dx = event.clientX - state.x, dy = event.clientY - state.y;
      if (Math.abs(dx) < Math.abs(dy) && !moved.current) return;
      if (Math.abs(dx) < 4 && !moved.current) return;
      moved.current = true; setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      setOffset((current === 0 && dx > 0) || (current === count - 1 && dx < 0) ? rubber ? dx * .15 : 0 : dx);
    },
    onPointerUp: event => finish(event), onPointerCancel: event => finish(event, true),
    // A child's implicit touch capture is transferred to the slider on drag.
    // Its bubbling lostcapture event must not cancel the slider's own gesture.
    onLostPointerCapture: event => { if (event.target === event.currentTarget) finish(event, true); },
    onPointerLeave: event => { if (event.pointerType === 'mouse' && resetOnMouseout) choose(0); },
    onClickCapture: event => { if (moved.current) { event.preventDefault(); event.stopPropagation(); moved.current = false; } }
  },
    h('div', { className: 'x-react-slider-wrapper', style: { gap, transform: `translateX(calc(${-current * 100}% - ${current * gap}px + ${offset}px))`, transition: dragging ? 'none' : 'transform var(--slider-duration, .25s)' } },
      slides.map((slide, index) => h('div', { key: slide.key ?? index, className: `x-react-slider-item${index === current ? ' active' : ''}`,
        role: 'group', 'aria-roledescription': 'slide', 'aria-label': `${index + 1} / ${count}`, inert: index !== current, 'aria-hidden': index !== current
      }, slide))),
    count > 1 && h('div', { className: 'x-react-slider-indicators', 'aria-hidden': true }, slides.map((slide, index) => h('span', { key: slide.key ?? index, className: index === current ? 'active' : undefined })))
  );
}
