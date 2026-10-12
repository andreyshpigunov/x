'use client';
import { createElement as h, useCallback, useEffect, useState } from 'react';

export function useMediaQuery(query, serverValue = false) {
  const [result, setResult] = useState({ query, matches: serverValue });
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setResult({ query, matches: media.matches });
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return result.query === query ? result.matches : serverValue;
}

export function useHover() {
  const [hovered, setHovered] = useState(false);
  return { hovered, bind: {
    onPointerEnter: useCallback(event => { if (event.pointerType !== 'touch') setHovered(true); }, []),
    onPointerLeave: useCallback(() => setHovered(false), [])
  } };
}

export function useSticky({ root = null, rootMargin = '-1px 0px 0px 0px' } = {}) {
  const [element, setElement] = useState(null);
  const [snapshot, setSnapshot] = useState({ element: null, stuck: false });
  const ref = useCallback(node => setElement(node), []);
  useEffect(() => {
    if (!element || typeof IntersectionObserver === 'undefined') return;
    let active = true;
    const observer = new IntersectionObserver(entries => {
      const entry = entries.find(entry => entry.target === element);
      if (entry && active) setSnapshot({ element, stuck: entry.intersectionRatio < 1 });
    }, { root, rootMargin, threshold: [1] });
    observer.observe(element);
    return () => { active = false; observer.disconnect(); };
  }, [element, root, rootMargin]);
  return { ref, stuck: snapshot.element === element && snapshot.stuck };
}

// React owns the animated styles/classes; this hook only reports progress.
export function useScrollProgress({ root = null, start = '100%', end = 0 } = {}) {
  const [element, setElement] = useState(null);
  const [snapshot, setSnapshot] = useState({ element: null, progress: 0 });
  const ref = useCallback(node => setElement(node), []);
  useEffect(() => {
    if (!element) return;
    const parent = root || window;
    let frame = 0;
    const pixels = value => typeof value === 'number' ? value :
      parseFloat(value) * (String(value).endsWith('vh') ? window.innerHeight / 100 :
        String(value).endsWith('%') ? (root ? root.clientHeight : window.innerHeight) / 100 : 1);
    const update = () => {
      frame = 0;
      const top = element.getBoundingClientRect().top - (root ? root.getBoundingClientRect().top + root.clientTop : 0);
      const from = pixels(start), to = pixels(end);
      const progress = from === to ? Number(top <= from) : Math.max(0, Math.min(1, (from - top) / (from - to)));
      if (Number.isFinite(progress)) setSnapshot(previous => previous.element === element && previous.progress === progress ? previous : { element, progress });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    parent.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(element); if (root) observer?.observe(root);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); parent.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [element, root, start, end]);
  return { ref, progress: snapshot.element === element ? snapshot.progress : 0 };
}

export function LazyImage({ loading = 'lazy', ...props }) {
  return h('img', { ...props, loading });
}

export function ScrollLink({ href, offset = 0, behavior = 'smooth', children, onClick, ...props }) {
  return h('a', { ...props, href, onClick: event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        props.download != null || props.target && props.target !== '_self' || !href.startsWith('#')) return;
    let id;
    try { id = decodeURIComponent(href.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : behavior });
    // Keep native fragment navigation's focus semantics for keyboard users.
    const previous = target.getAttribute('tabindex');
    if (previous === null) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    if (previous === null) target.addEventListener('blur', () => {
      if (target.getAttribute('tabindex') === '-1') target.removeAttribute('tabindex');
    }, { once: true });
    if (window.location.hash !== href) window.history.pushState(null, '', href);
  } }, children);
}
