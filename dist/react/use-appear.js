'use client';

import { useCallback, useEffect, useState } from 'react';

/** Observe one React-owned element, with a sticky `appeared` flag. */
export function useAppear({ root = null, rootMargin = '0px', threshold = 0, once = false } = {}) {
  const [element, setElement] = useState(null);
  const [snapshot, setSnapshot] = useState({ element: null, visible: false, appeared: false });
  const ref = useCallback(node => { setElement(node); }, []);
  // Equal arrays should not reconnect the observer on every render.
  const thresholdKey = JSON.stringify(threshold);

  useEffect(() => {
    if (!element) return;
    let active = true;
    const Observer = element.ownerDocument.defaultView?.IntersectionObserver;
    const update = visible => {
      if (!active) return;
      setSnapshot(previous => ({
        element,
        visible,
        appeared: visible || (previous.element === element && previous.appeared)
      }));
    };
    if (!Observer) {
      // Do not hide content indefinitely in environments without the observer API.
      update(true);
      return () => { active = false; };
    }
    const observer = new Observer(entries => {
      for (const entry of entries) {
        if (entry.target !== element || !active) continue;
        update(entry.isIntersecting);
        if (once && entry.isIntersecting) {
          observer.disconnect();
          active = false;
          break;
        }
      }
    }, { root, rootMargin, threshold: JSON.parse(thresholdKey) });
    observer.observe(element);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [element, root, rootMargin, thresholdKey, once]);

  return {
    ref,
    visible: snapshot.element === element && snapshot.visible,
    appeared: snapshot.element === element && snapshot.appeared
  };
}
