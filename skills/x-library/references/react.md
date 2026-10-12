# React 19: контракты X

Это ориентиры для выбора API. Точные типы установленного пакета проверяй в `dist/react/index.d.ts`, расширенные примеры — в `docs/react.md`. Нет экспортов `Tabs`, `useModal`, `Form`, `useDevice` или React-компонента `Typograf`.

| Задача | API | Важная особенность |
| --- | --- | --- |
| Модалка | Modal | Обязательны open, onOpenChange, title; дочерние элементы сохраняются после закрытия |
| Вкладки | Sheets | items: {id, label, content, disabled?}[]; панели остаются смонтированными |
| Меню | Dropdown | trigger — содержимое встроенной кнопки, не ещё одна кнопка |
| Поиск | Autocomplete<T> | Обязательны label, value, onValueChange, onSelect |
| Слайды | Slider | children со стабильными key; React сохраняет обработчики и состояние |
| Видимость | useAppear | ref, visible, appeared; once отключает наблюдение после появления |
| Подгрузка | useLoadMore<T> | loadPage возвращает {items, hasMore}; resetKey сбрасывает ленту |
| Анимация при прокрутке | useScrollProgress | ref и progress 0…1 для React style/className |
| Sticky | useSticky | ref, stuck; определяет intersectionRatio < 1, а не произвольное положение элемента |
| Наведение | useHover | hovered и bind для spread на элементы |
| Медиазапрос | useMediaQuery | query, serverValue=false; первый клиентский рендер совпадает с SSR |
| Картинка | LazyImage | Атрибуты img, loading=lazy; в next-cms можно оставить штатный Picture/Image |
| Прокрутка по якорю | ScrollLink | href="#id", offset, behavior; сохраняет фокус и учитывает reduced motion |

## Модалка

```tsx
'use client';
import { useRef, useState } from 'react';
import { Modal } from '@andreyshpigunov/x/react';

export function Contact() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null);
  return <>
    <button ref={trigger} onClick={() => setOpen(true)}>Связаться</button>
    <Modal open={open} onOpenChange={setOpen} title="Связаться" effect="up"
      returnFocusRef={trigger} initialFocusRef={field}
      style={{ '--modal-max-width': '640px', '--modal-padding-top': '48px' }}>
      <label>Имя<input ref={field} /></label>
    </Modal>
  </>;
}
```

`onOpenChange(false)` — запрос: родитель должен обновить open. Для обычного закрытия меняй open, не удаляй Modal условным рендером: иначе пропадёт выходная анимация. `returnFocusRef` особенно полезен в Safari, где клик не всегда фокусирует кнопку.

Эффекты: default, in, out, up, down, left, right. `windowClassName` оформляет внутреннее окно, `className` — dialog. `closeOnEscape` и `closeOnBackdrop` по умолчанию true. Есть description и closeLabel.

Переменные: четыре стороны `--modal-margin-*`, `--modal-padding-*`; `--modal-background`, `--modal-color`, `--modal-box-shadow`, `--modal-border-radius`, `--modal-overlay-background-color`, `--modal-max-width`; для крестика — `--modal-closer-margin-top/right`, `--modal-closer-area/size/width/color/color-hover`. Длительности задают `--modal-duration`, `--modal-closer-duration`, плавность — `--modal-easing`.

## Вкладки, меню и слайдер

Sheets: `value/defaultValue/onValueChange` используют строковый id. Уникальность id нужна внутри одной группы; вложенные группы независимы. Вкладки оформляет сайт, X только переключает панели и обеспечивает клавиатурное управление.

Dropdown: `open/defaultOpen/onOpenChange`; items с уникальным id и полями label, href, onSelect, disabled, divider, keepOpen. Стили общие с автодополнением. Сохраняй историческое имя переменной `--dropdown-backgroud-color` (именно так в X); не заменяй его выдуманным `--dropdown-background-color`. Есть `--dropdown-duration`.

Slider: `value/defaultValue/onValueChange` используют индекс; gap — число пикселей. По умолчанию rubber=true, touch=true, resetOnMouseout=true. На компьютере слайд выбирается положением мыши; на touch — свайпом. При сокращении children в управляемом режиме синхронизируй value с новым списком. Передавай обычные src/srcSet, не data-src; загрузкой владеет React/Next.js. Оформление — `--slider-*`, скорость — `--slider-duration`.

## Асинхронный поиск и лента

Autocomplete: выбирай либо items для локальной фильтрации, либо `loadData(query, {signal})`. Для объектов нужны getLabel и желательно getKey; renderItem возвращает ReactNode, не строку HTML. Не меняй value на выбранный объект: значение поля остаётся строкой, объект хранится отдельно через onSelect. debounce=400, minLength=1. Уход фокуса закрывает список без автоматического выбора первого результата.

```tsx
const feed = useLoadMore<Post>({
  resetKey: category,
  loadPage: async (page, { signal }) => {
    const response = await fetch(`/api/posts?category=${encodeURIComponent(category)}&page=${page}`, { signal });
    if (!response.ok) throw new Error('Не удалось загрузить');
    return response.json(); // { items: Post[], hasMore: boolean }
  },
});
```

Рендери feed.items через React и ставь feed.ref на маркер после списка. Пока маркер виден, страницы загружаются последовательно до hasMore=false. Ошибка доступна в feed.error; повтор — feed.loadMore(). Отключай кнопку при loading или !hasMore. resetKey меняй при смене фильтра, используй стабильный примитив/ключ, а не новый объект при каждом рендере. Передавай signal в fetch; при отмене не добавляй данные самостоятельно в стороннее состояние.

useScrollProgress принимает root, start и end (px-число, строка процентов высоты root или vh). useSticky работает со стилем position:sticky; пример X — top:-1px и rootMargin:'-1px 0px 0px 0px'. Учитывай, что частично обрезанный/невидимый элемент тоже может иметь intersectionRatio < 1.
