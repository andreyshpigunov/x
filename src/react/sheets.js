'use client';
import { createElement as h, useId, useRef } from 'react';
import { useControllable } from './shared.js';

export function Sheets({ items, value, defaultValue, onValueChange, label = 'Вкладки', orientation = 'horizontal', className = '', style }) {
  const available = items.filter(item => !item.disabled);
  const [selected, select] = useControllable(value, defaultValue ?? available[0]?.id, onValueChange);
  const current = available.some(item => item.id === selected) ? selected : available[0]?.id;
  const id = useId();
  const buttons = useRef(new Map());
  const activate = key => { select(key); buttons.current.get(key)?.focus(); };
  return h('div', { className: `x-react-sheets ${className}`.trim(), style },
    h('div', { role: 'tablist', 'aria-label': label, 'aria-orientation': orientation }, items.map((item, index) => h('button', {
      key: item.id, ref: node => { if (node) buttons.current.set(item.id, node); else buttons.current.delete(item.id); },
      type: 'button', role: 'tab', id: `${id}-tab-${index}`, 'aria-controls': `${id}-panel-${index}`,
      'aria-selected': current === item.id, tabIndex: current === item.id ? 0 : -1,
      disabled: item.disabled, className: current === item.id ? 'active' : undefined,
      onClick: () => select(item.id),
      onKeyDown: event => {
        const next = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
        const prev = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
        if (![next, prev, 'Home', 'End'].includes(event.key) || !available.length) return;
        event.preventDefault();
        const index = available.findIndex(item => item.id === current);
        activate(available[event.key === 'Home' ? 0 : event.key === 'End' ? available.length - 1 :
          (index + (event.key === next ? 1 : -1) + available.length) % available.length].id);
      }
    }, item.label))),
    items.map((item, index) => h('div', {
      key: item.id, role: 'tabpanel', id: `${id}-panel-${index}`, 'aria-labelledby': `${id}-tab-${index}`,
      hidden: item.id !== current, tabIndex: 0, className: item.id === current ? 'active' : undefined
    }, item.content))
  );
}
