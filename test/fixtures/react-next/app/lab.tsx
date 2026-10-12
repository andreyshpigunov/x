'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Modal, useAppear, type ModalProps } from '@andreyshpigunov/x/react';

export function Lab({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [effect, setEffect] = useState<ModalProps['effect']>('default');
  const [long, setLong] = useState(false);
  const [custom, setCustom] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  const [nested, setNested] = useState(false);
  const [second, setSecond] = useState(false);
  const [present, setPresent] = useState(true);
  const [dismiss, setDismiss] = useState(true);
  const [name, setName] = useState('');
  const [count, setCount] = useState(0);
  const [changes, setChanges] = useState(0);
  const [replacement, setReplacement] = useState(false);
  const fieldRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const nestedOpenerRef = useRef<HTMLButtonElement>(null);
  const secondOpenerRef = useRef<HTMLButtonElement | null>(null);
  const appearance = useAppear<HTMLElement>({ threshold: [0, 0.5] });
  const once = useAppear<HTMLElement>({ once: true });
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const inside = useAppear<HTMLDivElement>({ root: scrollRoot });

  function changeOpen(next: boolean) {
    setChanges(value => value + 1);
    setOpen(next);
  }

  return <main>
    <p className="eyebrow">X / REACT · ЛОКАЛЬНЫЙ СТЕНД</p>
    <h1>Компоненты, которые<br />живут вместе с React.</h1>
    <p className="intro">Отдельный npm-пакет из локального архива. Next.js, серверный рендеринг,
      управляемое состояние и обычная вёрстка без глобальных стилей X.</p>
    <section className="card">
      <h2>Модальные окна</h2>
      <p>Проверьте ввод, обновление содержимого, вложенность, Escape и возврат фокуса.</p>
      <label>Эффект открытия<select aria-label="Эффект открытия" value={effect} onChange={event => setEffect(event.target.value as ModalProps['effect'])}>
        {['default', 'in', 'out', 'up', 'down', 'left', 'right'].map(value => <option key={value}>{value}</option>)}
      </select></label>
      <label className="setting"><input type="checkbox" checked={long} onChange={event => setLong(event.target.checked)} />Длинное содержимое</label>
      <label className="setting"><input type="checkbox" checked={custom} onChange={event => setCustom(event.target.checked)} />Свои CSS-переменные</label>
      <div className="actions">
        <button ref={openerRef} onClick={() => { setPresent(true); setOpen(true); }}>Открыть окно</button>
        <button className="secondary" onClick={event => { secondOpenerRef.current = event.currentTarget; setSecond(true); }}>Второе независимое окно</button>
      </div>
      <label className="setting"><input type="checkbox" checked={dismiss}
        onChange={event => setDismiss(event.target.checked)} /> Закрывать по Escape и фону</label>
      <p data-testid="changes">Запросов закрытия: {changes}</p>
    </section>
    <section className="card">
      <h2>Наблюдение за видимостью</h2>
      <p>Прокрутите страницу до цветных блоков. «Был виден» сохраняется после выхода из области просмотра.</p>
      <p data-testid="appearance-status">Виден: {String(appearance.visible)} · Был виден: {String(appearance.appeared)}</p>
      <p data-testid="once-status">Один раз: {String(once.appeared)}</p>
      <button className="secondary" onClick={() => setReplacement(value => !value)}>Заменить наблюдаемый элемент</button>
      <div className="scroll-root" ref={setScrollRoot} data-testid="scroll-root">
        <p>Отдельная прокручиваемая область ↓</p>
        <div className="inner-spacer" />
        <div ref={inside.ref} data-x-observe="inner" data-testid="inner-target">Элемент внутри контейнера</div>
      </div>
      <p data-testid="inner-status">В контейнере: {String(inside.visible)}</p>
    </section>
    <nav><Link href="/components">Остальные компоненты</Link> · <Link href="/second">Перейти на вторую страницу</Link> · <a href="/legacy.html">Проверить обычную X</a></nav>
    <div className="spacer" />
    <section key={String(replacement)} ref={appearance.ref} data-x-observe="repeat"
      data-testid="appearance-target" className="appearance">
      <h2>Повторное наблюдение</h2><p>Этот элемент: {replacement ? 'новый' : 'исходный'}.</p>
    </section>
    <section ref={once.ref} data-x-observe="once" data-testid="once-target" className="appearance once">
      <h2>Одно наблюдение</h2><p>После первого появления наблюдатель отключается.</p>
    </section>
    <div className="spacer" />

    {present && <Modal effect={effect} style={custom ? {
      '--modal-max-width': '640px', '--modal-background': '#fff8e8',
      '--modal-border-radius': '8px', '--modal-closer-color': '#294fc4',
      '--modal-padding-top': '60px', '--modal-duration': '.4s'
    } : undefined} open={open} onOpenChange={changeOpen} title="Контакт"
      description="Содержимое и события этого окна полностью управляются React."
      initialFocusRef={fieldRef} returnFocusRef={openerRef} closeOnEscape={dismiss} closeOnBackdrop={dismiss}>
      <form onSubmit={event => event.preventDefault()}>
        <label>Имя<input ref={fieldRef} value={name} onChange={event => setName(event.target.value)} /></label>
        <p data-testid="greeting">Здравствуйте, {name || 'гость'}!</p>
        <button type="button" onClick={() => setCount(value => value + 1)}>Счётчик: {count}</button>
        <div className="actions">
          <button ref={nestedOpenerRef} type="button" className="secondary" onClick={() => setNested(true)}>Открыть вложенное</button>
          <button type="button" className="secondary" onClick={event => { secondOpenerRef.current = event.currentTarget; setSecond(true); }}>Открыть независимое поверх</button>
        </div>
        <p><Link href="/second">Уйти со страницы</Link></p>
        <button type="button" className="secondary" onClick={() => setPresent(false)}>Удалить компонент</button>
      </form>
      {long && <div data-testid="long-content">{Array.from({ length: 30 }, (_, index) => <p key={index}>Раздел {index + 1}. Прокрутите окно: крестик остаётся доступным у верхнего края.</p>)}</div>}
      <Modal open={nested} onOpenChange={setNested} title="Вложенное окно" returnFocusRef={nestedOpenerRef}>
        <p>Escape закрывает только верхнее окно.</p>
        <button onClick={() => setNested(false)}>Вернуться к форме</button>
      </Modal>
    </Modal>}
    <Modal open={second} onOpenChange={setSecond} title="Независимое окно" returnFocusRef={secondOpenerRef}>
      <p>Его состояние не зависит от первого компонента.</p>
      <button onClick={() => { setOpen(false); setPresent(false); }}>Удалить нижнее окно</button>
    </Modal>
  </main>;
}
