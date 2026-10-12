'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useLatest(value) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useControllable(value, defaultValue, onChange) {
  const [local, setLocal] = useState(defaultValue);
  const current = value === undefined ? local : value;
  const latest = useLatest({ current, value, onChange });
  const set = useCallback(next => {
    const state = latest.current;
    if (Object.is(next, state.current)) return;
    if (state.value === undefined) setLocal(next);
    state.onChange?.(next);
  }, [latest]);
  return [current, set];
}

// Keep the menu mounted for the same exit transition as vanilla X.
export function useDisclosure(open, ref) {
  const [ready, setReady] = useState(open);
  const [active, setActive] = useState(false);
  useEffect(() => {
    let timer;
    if (open) {
      setReady(true);
      timer = setTimeout(() => setActive(true), 20);
    } else {
      setActive(false);
      const css = ref.current && getComputedStyle(ref.current);
      const ms = value => parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000);
      const delays = css?.transitionDelay.split(',').map(ms) || [0];
      const duration = css ? Math.max(0, ...css.transitionDuration.split(',').map((value, i) => ms(value) + delays[i % delays.length])) : 200;
      timer = setTimeout(() => setReady(false), duration);
    }
    return () => clearTimeout(timer);
  }, [open, ref]);
  return { ready: open || ready, active: open && active };
}

export function useMenuPosition(open, root, menu) {
  const [position, setPosition] = useState('');
  useEffect(() => {
    if (!open || !root.current || !menu.current) return;
    const update = () => {
      const box = root.current.getBoundingClientRect();
      const width = menu.current.offsetWidth;
      const height = menu.current.offsetHeight;
      const right = box.left + width > window.innerWidth;
      const bottom = box.bottom + height > window.innerHeight && box.top > window.innerHeight - box.bottom;
      setPosition(`${right ? ' x-react-dropdown_right' : ''}${bottom ? ' x-react-dropdown_bottom' : ''}`);
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(root.current);
    observer?.observe(menu.current);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, root, menu]);
  return position;
}
