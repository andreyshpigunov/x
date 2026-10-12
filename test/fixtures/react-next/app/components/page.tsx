'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Sheets, Dropdown, Autocomplete, Slider, useLoadMore, useMediaQuery, useHover, useSticky, useScrollProgress, LazyImage, ScrollLink } from '@andreyshpigunov/x/react';
import '@andreyshpigunov/x/styles/sheets.css';
import '@andreyshpigunov/x/styles/dropdown.css';
import '@andreyshpigunov/x/styles/slider.css';

function Counter() { const [count, setCount] = useState(0); return <button onClick={() => setCount(count + 1)}>Внутренний счётчик: {count}</button>; }
function Feed({ label }: { label: string }) {
  const [version, setVersion] = useState(0);
  const feed = useLoadMore({ resetKey: version, loadPage: async (page, { signal }) => {
    await new Promise(resolve => setTimeout(resolve, 40));
    if (signal.aborted) throw new Error('aborted');
    return { items: [`${label}: ${page}`], hasMore: page < 3 };
  } });
  return <section aria-label={label}><h2>{label}</h2>{feed.items.map(item => <p key={item}>{item}</p>)}
    <div ref={feed.ref} data-x-observe="feed" /><button onClick={() => { void feed.loadMore(); }} disabled={feed.loading || !feed.hasMore}>Загрузить {label}</button>
    <button onClick={() => setVersion(version + 1)}>Сбросить {label}</button></section>;
}
export default function Components() {
  const [query, setQuery] = useState('');
  const [choice, setChoice] = useState('');
  const [action, setAction] = useState('');
  const [slide, setSlide] = useState(0);
  const [count, setCount] = useState(3);
  const [present, setPresent] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const wide = useMediaQuery('(min-width: 768px)');
  const hover = useHover();
  const sticky = useSticky();
  const progress = useScrollProgress({ start: '100%', end: 0 });
  return <main>
    <p className="eyebrow">X / REACT · КОМПОНЕНТЫ</p><h1>Остальные компоненты X</h1>
    <p><Link href="/">Модальные окна</Link> · <ScrollLink href="#scroll-target" behavior="instant">К анимации</ScrollLink></p>
    <button onClick={() => setPresent(!present)}>Переключить компоненты</button>
    {present && <>
      <section className="card"><h2>Вкладки</h2><Sheets label="Пример вкладок" items={[
        { id: 'one', label: 'Первая', content: <Counter /> },
        { id: 'disabled', label: 'Недоступная', content: 'нет', disabled: true },
        { id: 'two', label: 'Вторая', content: <Sheets label="Вложенные вкладки" items={[
          { id: 'one', label: 'Внутри 1', content: 'Вложенная первая' },
          { id: 'two', label: 'Внутри 2', content: 'Вложенная вторая' }]} /> }
      ]} /></section>
      <section className="card"><h2>Меню</h2><div className="actions">
        <Dropdown trigger="Открыть меню" items={[
          { id: 'a', label: 'Первое действие', onSelect: () => setAction('Первое') },
          { id: 'b', label: 'Заблокировано', disabled: true },
          { id: 'c', divider: true },
          { id: 'd', label: 'Последнее действие', onSelect: () => setAction('Последнее') }
        ]} />
        <Dropdown trigger="Второе меню" open={menuOpen} onOpenChange={setMenuOpen} items={[
          { id: 'keep', label: 'Оставить открытым', keepOpen: true, onSelect: () => setAction('Открыто') }
        ]} />
      </div><p data-testid="menu-action">{action}</p></section>
      <section className="card"><h2>Автодополнение</h2>
        <Autocomplete label="Поиск города" value={query} onValueChange={setQuery} onSelect={setChoice} debounce={20}
          loadData={async q => { await new Promise(resolve => setTimeout(resolve, q === 'old' ? 350 : 30));
            if (q === 'error') throw new Error('test'); return [q + ' 1', q + ' 2']; }} />
        <p data-testid="selected-city">{choice}</p><button onClick={() => setQuery('')}>Очистить поиск</button>
      </section>
      <section className="card"><h2>Слайдер</h2>
        <Slider value={slide} onValueChange={setSlide} resetOnMouseout={false} gap={12} label="Галерея" style={{ '--slider-point-color-active': '#294fc4' }}>
          {Array.from({ length: count }, (_, index) => <div key={index} style={{ background: ['#dce7ff', '#d7eee4', '#fff3d6'][index], padding: 32, minHeight: 200, width: '100%', boxSizing: 'border-box' }}>
            <h3>Слайд {index + 1}</h3><Counter />
          </div>)}
        </Slider><p data-testid="slide">Слайд: {slide + 1}</p>
        <button onClick={() => setSlide(Math.max(0, slide - 1))}>Назад</button> <button onClick={() => setSlide(Math.min(count - 1, slide + 1))}>Вперёд</button>
        <button onClick={() => setCount(count === 3 ? 1 : 3)}>Изменить число слайдов</button>
      </section>
      <section className="card"><h2>Состояния и изображения</h2>
        <p data-testid="wide">Широкий экран: {String(wide)}</p><p {...hover.bind} data-testid="hover">Наведение: {String(hover.hovered)}</p>
        <LazyImage src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='40'%3E%3Crect width='80' height='40' fill='royalblue'/%3E%3C/svg%3E" width={80} height={40} alt="Пример lazy image" />
        <div style={{ height: 200, overflow: 'auto' }}><div ref={sticky.ref} style={{ position: 'sticky', top: -1, background: '#eee' }}>Sticky: {String(sticky.stuck)}</div><div style={{ height: 500 }} /></div>
      </section>
      <Feed label="Лента A" /><Feed label="Лента B" />
      <div className="spacer" /><section id="scroll-target" ref={progress.ref} data-x-observe="progress" className="card" style={{ opacity: .3 + progress.progress * .7 }}>
        <h2>Анимация от прокрутки</h2><p data-testid="progress">Прогресс: {progress.progress.toFixed(2)}</p>
      </section><div className="spacer" />
    </>}
    <Link href="/second">Уйти со страницы</Link>
  </main>;
}
