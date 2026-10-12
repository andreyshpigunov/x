'use client';

import { createElement as h, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Shared only by React modals. Never initialize or tear down the vanilla singleton.
const scrollLocks = new WeakMap();

function lockScroll(doc) {
  let state = scrollLocks.get(doc);
  if (!state) {
    const style = doc.documentElement.style;
    state = {
      count: 0,
      value: style.getPropertyValue('overflow'),
      priority: style.getPropertyPriority('overflow')
    };
    scrollLocks.set(doc, state);
    style.setProperty('overflow', 'hidden');
  }
  state.count++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--state.count) return;
    const style = doc.documentElement.style;
    if (style.getPropertyValue('overflow') === 'hidden') {
      if (state.value) style.setProperty('overflow', state.value, state.priority);
      else style.removeProperty('overflow');
    }
    scrollLocks.delete(doc);
  };
}

function outside(event) {
  return event.target.closest('dialog') === event.currentTarget &&
    !event.target.closest('.x-react-modal__window');
}

function handleKeyDown(event) {
  // Do not let an underlying vanilla modal's document listener also handle Escape.
  if (event.key === 'Escape') event.stopPropagation();
  if (event.key !== 'Tab' || event.defaultPrevented || event.target.closest('dialog') !== event.currentTarget) return;
  const dialog = event.currentTarget;
  const items = [...dialog.querySelectorAll(
    'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]'
  )].filter(element => element.tabIndex >= 0 && !element.matches(':disabled') &&
    !element.closest('[inert], [aria-hidden="true"]') && element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== 'hidden')
    .sort((a, b) => (a.tabIndex || Number.MAX_SAFE_INTEGER) - (b.tabIndex || Number.MAX_SAFE_INTEGER));
  const current = dialog.ownerDocument.activeElement;
  const index = items.indexOf(current);
  const next = index < 0 ? (event.shiftKey ? items.length - 1 : 0)
    : (index + (event.shiftKey ? -1 : 1) + items.length) % items.length;
  // Explicit cycling also covers Safari's preference to skip buttons with Tab.
  event.preventDefault();
  (items[next] || dialog).focus();
}

/** Controlled, native modal dialog. Its children remain owned by React. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  closeLabel = 'Закрыть',
  closeOnEscape = true,
  closeOnBackdrop = true,
  initialFocusRef,
  returnFocusRef,
  effect = 'default',
  className = '',
  windowClassName = '',
  style
}) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef(null);
  const focusRef = useRef(initialFocusRef);
  focusRef.current = initialFocusRef;
  const returnRef = useRef(returnFocusRef);
  returnRef.current = returnFocusRef;
  const pointerStartedOutside = useRef(false);
  const id = useId();
  const session = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  // Unmount (including Strict Mode cleanup) releases resources immediately.
  useEffect(() => () => {
    session.current?.finish();
    session.current = null;
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!mounted || !dialog) return;
    let timer;
    if (open) {
      if (!session.current) {
        const restoreTarget = returnRef.current?.current || dialog.ownerDocument.activeElement;
        dialog.showModal();
        const unlock = lockScroll(dialog.ownerDocument);
        session.current = { finish() {
          dialog.removeAttribute('data-active');
          if (dialog.open) dialog.close();
          unlock();
          if (restoreTarget?.isConnected && typeof restoreTarget.focus === 'function') {
            restoreTarget.focus({ preventScroll: true });
          }
        } };
        const target = focusRef.current?.current;
        if (target && dialog.contains(target)) target.focus({ preventScroll: true });
        dialog.querySelector('.x-react-modal__outer').scrollTo(0, 1);
      }
      // Commit the initial transform before activating the same transition as X.
      dialog.querySelector('.x-react-modal__window').getBoundingClientRect();
      timer = setTimeout(() => dialog.setAttribute('data-active', ''), 10);
    } else if (session.current) {
      dialog.removeAttribute('data-active');
      // Read actual CSS timing so custom durations/delays also finish correctly.
      const milliseconds = value => parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000);
      const duration = Math.max(0, ...[...dialog.querySelectorAll(
        '.x-react-modal__window, .x-react-modal__overlay, .x-react-modal__close'
      )].map(element => {
        const css = getComputedStyle(element);
        const delays = css.transitionDelay.split(',').map(milliseconds);
        return Math.max(0, ...css.transitionDuration.split(',').map((value, index) =>
          milliseconds(value) + delays[index % delays.length]));
      }));
      timer = setTimeout(() => {
        session.current?.finish();
        session.current = null;
      }, duration);
    }
    return () => clearTimeout(timer);
  }, [mounted, open]);

  // Match server output on the first client render; access document only after mount.
  if (!mounted) return null;

  return createPortal(h('dialog', {
    ref: dialogRef,
    className: `x-react-modal ${className}`.trim(),
    style,
    'data-effect': effect,
    'aria-labelledby': `${id}-title`,
    'aria-describedby': description != null ? `${id}-description` : undefined,
    onKeyDown: handleKeyDown,
    onCancel: event => {
      event.preventDefault();
      event.stopPropagation();
      if (closeOnEscape) onOpenChange(false);
    },
    onClose: event => {
      // Ignore delayed close events from an effect cleanup followed by a reopen.
      if (event.target === event.currentTarget && !event.currentTarget.open && open) {
        onOpenChange(false);
      }
    },
    onPointerDown: event => { pointerStartedOutside.current = outside(event); },
    onPointerCancel: () => { pointerStartedOutside.current = false; },
    onClick: event => {
      const dismiss = pointerStartedOutside.current && outside(event);
      pointerStartedOutside.current = false;
      if (dismiss && closeOnBackdrop) onOpenChange(false);
    }
  },
  h('div', { className: 'x-react-modal__overlay', 'aria-hidden': true }),
  h('div', { className: 'x-react-modal__outer' },
    h('div', { className: 'x-react-modal__inner' },
      h('div', { className: `x-react-modal__window ${windowClassName}`.trim() },
        h('h2', { id: `${id}-title`, className: 'x-react-modal__title' }, title),
        description != null && h('p', { id: `${id}-description`, className: 'x-react-modal__description' }, description),
        h('div', { className: 'x-react-modal__content' }, children),
        h('div', { className: 'x-react-modal__rail' }, h('button', {
          type: 'button', className: 'x-react-modal__close',
          'aria-label': closeLabel, onClick: () => onOpenChange(false)
        }))
      )
    )
  )
  ), document.body);
}
