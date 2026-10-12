'use client';
import { createElement as h, useEffect, useId, useRef, useState } from 'react';
import { useDisclosure, useLatest, useMenuPosition } from './shared.js';

const empty = [];
export function Autocomplete({ value, onValueChange, onSelect, loadData, items = empty, getLabel = String,
  getKey, renderItem, label, minLength = 1, debounce = 400, disabled = false,
  placeholder, name, className = '', style, loadingContent = 'Загрузка…', emptyContent = 'Ничего не найдено',
  errorContent = 'Не удалось загрузить', inputProps = {} }) {
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(-1);
  const [result, setResult] = useState({ query: null, items: [], status: 'idle' });
  const root = useRef(null), menu = useRef(null), field = useRef(null);
  const latest = useLatest({ loadData, getLabel });
  const id = useId();
  const eligible = focused && !disabled && value.trim().length >= minLength;
  const options = result.query === value ? result.items : [];
  const open = eligible;
  const { ready, active } = useDisclosure(open, menu);
  const position = useMenuPosition(open, root, menu);
  const current = selected >= 0 && selected < options.length ? selected : -1;
  useEffect(() => {
    setSelected(-1);
    if (!eligible) return;
    const controller = new AbortController();
    let alive = true;
    setResult({ query: value, items: [], status: 'loading' });
    const timer = setTimeout(async () => {
      try {
        const data = latest.current.loadData ? await latest.current.loadData(value, { signal: controller.signal }) :
          items.filter(item => latest.current.getLabel(item).toLocaleLowerCase().includes(value.toLocaleLowerCase()));
        if (alive) setResult({ query: value, items: data, status: 'ready' });
      } catch (error) {
        if (alive) setResult({ query: value, items: [], status: 'error' });
      }
    }, Math.max(0, debounce));
    return () => { alive = false; clearTimeout(timer); controller.abort(); };
  }, [value, eligible, debounce, items, latest]);
  const choose = item => { onValueChange(getLabel(item)); onSelect(item); setFocused(false); setSelected(-1); };
  useEffect(() => {
    if (open && current >= 0) menu.current?.querySelectorAll('[role="option"]')[current]?.scrollIntoView({ block: 'nearest' });
  }, [open, current]);
  const status = result.query === value ? result.status : 'loading';
  return h('div', { ref: root, className: `x-react-dropdown x-react-autocomplete${ready ? ' x-react-dropdown_ready' : ''}${active ? ' x-react-dropdown_open' : ''}${position} ${className}`.trim(), style },
    h('label', { htmlFor: `${id}-input` }, label),
    h('input', { ...inputProps, ref: field, id: `${id}-input`, value, name, disabled, placeholder,
      role: 'combobox', autoComplete: 'off', 'aria-autocomplete': 'list', 'aria-expanded': open,
      'aria-controls': `${id}-list`, 'aria-activedescendant': open && current >= 0 ? `${id}-option-${current}` : undefined,
      onChange: event => { setSelected(-1); onValueChange(event.target.value); setFocused(true); },
      onFocus: () => setFocused(true), onBlur: () => setFocused(false),
      onKeyDown: event => {
        if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setFocused(false); return; }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setFocused(true);
          if (options.length) setSelected(event.key === 'ArrowDown' ? (current + 1) % options.length : (current <= 0 ? options.length - 1 : current - 1));
        } else if (event.key === 'Enter' && open && current >= 0) { event.preventDefault(); choose(options[current]); }
      }
    }),
    h('ul', { id: `${id}-list`, ref: menu, role: 'listbox', inert: !open, 'aria-label': label, 'aria-busy': status === 'loading', className: 'x-react-dropdown__menu',
      onPointerDown: event => event.preventDefault()
    }, options.length ? options.map((item, index) => h('li', { key: getKey ? getKey(item) : index,
      id: `${id}-option-${index}`, role: 'option', 'aria-selected': current === index, 'data-item': '',
      onPointerMove: () => setSelected(index), onClick: () => choose(item)
    }, h('span', null, renderItem ? renderItem(item) : getLabel(item)))) :
      h('li', { role: 'presentation' }, h('span', null, status === 'loading' ? loadingContent : status === 'error' ? errorContent : emptyContent))),
    h('span', { className: 'x-react-sr-only', role: 'status', 'aria-live': 'polite' }, open ?
      status === 'loading' ? loadingContent : status === 'error' ? errorContent : `${options.length}` : '')
  );
}
