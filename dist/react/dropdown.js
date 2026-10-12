'use client';
import { createElement as h, useEffect, useId, useRef } from 'react';
import { useControllable, useDisclosure, useMenuPosition } from './shared.js';

export function Dropdown({ trigger, items, open: controlled, defaultOpen = false, onOpenChange, label = 'Меню', className = '', style, disabled = false }) {
  const [open, setOpen] = useControllable(controlled, defaultOpen, onOpenChange);
  const root = useRef(null), menu = useRef(null), button = useRef(null), pendingFocus = useRef(null);
  const id = useId();
  const { ready, active } = useDisclosure(open, menu);
  const position = useMenuPosition(open, root, menu);
  const focusable = () => [...menu.current.querySelectorAll('[role="menuitem"]:not(:disabled):not([aria-disabled="true"])')];
  useEffect(() => {
    if (!open) return;
    const close = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    if (pendingFocus.current != null) {
      const nodes = focusable();
      nodes[pendingFocus.current === 'last' ? nodes.length - 1 : 0]?.focus();
      pendingFocus.current = null;
    }
    return () => document.removeEventListener('pointerdown', close);
  }, [open, setOpen]);
  return h('div', { ref: root, style, className: `x-react-dropdown${ready ? ' x-react-dropdown_ready' : ''}${active ? ' x-react-dropdown_open' : ''}${position} ${className}`.trim(),
    onBlur: event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); },
    onKeyDown: event => {
      if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); button.current?.focus(); }
    }
  },
    h('button', { ref: button, type: 'button', disabled, 'aria-expanded': open, 'aria-haspopup': 'menu', 'aria-controls': id,
      onClick: event => { event.currentTarget.focus(); setOpen(!open); }, onKeyDown: event => {
        if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
        event.preventDefault();
        pendingFocus.current = event.key === 'ArrowUp' ? 'last' : 'first';
        if (open) { const nodes = focusable(); nodes[event.key === 'ArrowUp' ? nodes.length - 1 : 0]?.focus(); pendingFocus.current = null; }
        else setOpen(true);
      }
    }, trigger),
    h('ul', { ref: menu, id, role: 'menu', 'aria-label': label, inert: !open, className: 'x-react-dropdown__menu', onKeyDown: event => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const nodes = focusable();
      const index = nodes.indexOf(document.activeElement);
      nodes[event.key === 'Home' ? 0 : event.key === 'End' ? nodes.length - 1 :
        (index + (event.key === 'ArrowDown' ? 1 : -1) + nodes.length) % nodes.length]?.focus();
    } }, items.map(item => item.divider ? h('li', { key: item.id, role: 'separator', className: 'divider' }) : h('li', { key: item.id, role: 'none' },
      h(item.href && !item.disabled ? 'a' : 'button', { href: item.disabled ? undefined : item.href, type: item.href && !item.disabled ? undefined : 'button',
        role: 'menuitem', tabIndex: -1, disabled: item.disabled, 'aria-disabled': item.disabled || undefined,
        onClick: () => { if (item.disabled) return; item.onSelect?.(); if (!item.keepOpen) { setOpen(false); button.current?.focus(); } }
      }, item.label)
    )))
  );
}
