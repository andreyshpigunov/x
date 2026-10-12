# React 19: предварительная версия 0.6.0-beta.1

Локальная версия содержит React-компоненты и хуки для интерактивных модулей X.
Поддерживаемая версия React — 19;
стенд проверяет React 19.3 и Next.js 16.3.8. React 18 не поддерживается; адаптер рассчитан на React 19 и React DOM 19.
Пакет не опубликован: наличие кода в репозитории не означает наличие этих экспортов в npm.

## Совместимость

- Старые импорты, `window.x`, `x.init()`, HTML-атрибуты и полный `x.css` сохраняются.
- React импортируется только через `@andreyshpigunov/x/react`.
- React и React DOM — необязательные peer-зависимости; обычному сайту они не нужны.
- React-модуль не импортирует обычный `x`, не вызывает его `init()`/`destroy()`
  и не добавляет обработчики к чужим компонентам.
- Компонент использует собственные классы `x-react-modal*`; старые селекторы
  `.modal` и `[x-modal]` его не обрабатывают.
- CSS подключается явно. В отдельном файле модалки нет глобального reset.
- Интерактивная точка входа сохраняет `'use client'`; React не включён в её сборку.

## Локальная проверка без публикации

```sh
npm ci
npx playwright install chromium webkit
npm test
npm run test:react
```

`test:react` собирает библиотеку, создаёт архив через `npm pack`, устанавливает его
в изолированный Next.js-стенд и проверяет обычного потребителя без React.
Затем запускает Chromium в dev/Strict Mode и Chromium + WebKit на production-сборке.
Серверы слушают только `127.0.0.1` и закрываются после тестов.
Стенд, архивы, логи и скриншоты находятся в игнорируемой Git папке `.local/react-test/`.
Никаких `push`, `publish` или действий с базой CMS эти команды не выполняют.

Для ручной проверки:

```sh
npm run dev:react
```

Стенд доступен по `http://127.0.0.1:3210`; порт можно изменить через `X_REACT_PORT`.
Команда заново собирает и устанавливает локальный архив. После изменения библиотеки
перезапустите её: исходники пакета намеренно не подключаются через симлинк.
Остановить сервер — Ctrl+C. При наличии всех зависимостей в кеше можно задать
`X_NPM_OFFLINE=1`. Первый запуск обычно требует скачивания зависимостей и браузеров.

Для подключения архива к отдельной тестовой копии сайта:

```sh
npm install --save-exact /absolute/path/to/x-ARCHIVE_HASH.tgz
```

Путь к полученному архиву выводит `dev:react`. В рабочий сайт пакет не устанавливается автоматически.
Версия предварительного выпуска — `0.6.0-beta.1`; локальные архивы дополнительно
различаются хешем содержимого. Публикация выполняется при создании GitHub Release.
Workflow направляет предварительные версии в npm-тег `beta`, стабильные — в `latest`.

## Modal

В layout публичного шаблона подключите:

```tsx
import '@andreyshpigunov/x/styles/modal.css';
```

В клиентском компоненте:

```tsx
'use client';

import { useRef, useState } from 'react';
import { Modal } from '@andreyshpigunov/x/react';

export function Contact() {
  const [open, setOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return <>
    <button ref={triggerRef} onClick={() => setOpen(true)}>Связаться</button>
    <Modal open={open} onOpenChange={setOpen} title="Связаться"
      description="Оставьте контактные данные." initialFocusRef={nameRef} returnFocusRef={triggerRef}>
      <label>Имя<input ref={nameRef} /></label>
    </Modal>
  </>;
}
```

| Параметр | Назначение |
| --- | --- |
| `open` | Обязательное управляемое состояние |
| `onOpenChange` | Обязательный обработчик запроса закрытия; получает `false` |
| `title` | Обязательный видимый заголовок и доступное имя окна |
| `description` | Необязательное описание, связанное через ARIA |
| `children` | Содержимое React, включая формы и компоненты сайта |
| `initialFocusRef` | Необязательный ref на элемент внутри окна для начального фокуса |
| `returnFocusRef` | Ref открывающей кнопки для надёжного возврата фокуса, в том числе после клика в Safari |
| `closeLabel` | Подпись кнопки закрытия, по умолчанию «Закрыть» |
| `closeOnEscape` | Закрытие по Escape, по умолчанию `true` |
| `closeOnBackdrop` | Закрытие по фону, по умолчанию `true` |
| `effect` | Эффект X: `default`, `in`, `out`, `up`, `down`, `left`, `right` |
| `windowClassName` | Класс внутреннего окна для оформления содержимого |
| `className`, `style` | Дополнительное оформление элемента `dialog` |

Модалка использует `HTMLDialogElement.showModal()` и портал в `document.body`.
Требуется браузер с поддержкой нативного modal dialog; полифилл не включён.
Содержимое рендерится после монтирования, на сервере модалка возвращает `null`.
Основной SEO-контент следует размещать на странице, а не только в модальном окне.

Кнопка закрытия, Escape и клик по фону запрашивают изменение `open`; родитель
должен обновить состояние. Форма внутри окна использует обычный React `onSubmit`;
для управляемого закрытия вызывайте свой `setOpen(false)`.
Вложенные окна имеют отдельное состояние. Tab удерживается внутри верхнего окна,
браузер блокирует взаимодействие с фоном. При закрытии фокус возвращается к
`returnFocusRef` или элементу, который был активен перед открытием. Рекомендуется
передавать `returnFocusRef`: Safari не всегда фокусирует кнопку при клике мышью.
Прокрутка документа разблокируется после закрытия последней React-модалки.
При удалении компонента или переходе страницы ресурсы освобождаются.

Закрытая модалка после первого монтирования остаётся в DOM: состояние её дочерних
React-компонентов сохраняется. Если нужен сброс формы, задавайте его явно или
условно размонтируйте компонент. Открытие и закрытие используют переходы X (200 мс,
крестик — 150 мс). При закрытии окно, блокировка фона и фокус сохраняются до конца
перехода. Повторное открытие прерывает закрытие. Удаление компонента освобождает
ресурсы сразу. Длинное окно прокручивается целиком, крестик закрепляется на рейке.

```tsx
<Modal open={open} onOpenChange={setOpen} title="Контакт" effect="up"
  style={{ '--modal-max-width': '640px', '--modal-background': '#fff8e8',
    '--modal-closer-color': '#294fc4', '--modal-duration': '.3s' }}>
  <ContactForm />
</Modal>
```

Значения по умолчанию совпадают с X: поля снаружи `3vw`, внутренние отступы
`clamp(2.5rem, 4vw, 5rem)`, ширина до `80rem`, радиус `1.6rem`.
Единицы `rem` зависят от корневого шрифта сайта, как и в обычной X.
React CSS не меняет этот шрифт глобально.

Оформление использует переменные X с локальными значениями по умолчанию:
`--modal-background`, `--modal-color`, `--modal-margin-*`, `--modal-padding-*`,
`--modal-border-radius`, `--modal-box-shadow`, `--modal-overlay-background-color`,
`--modal-closer-margin-top`, `--modal-closer-margin-right`, `--modal-closer-area`,
`--modal-closer-size`, `--modal-closer-width`, `--modal-closer-color`,
`--modal-closer-color-hover`. Для `margin-*` и `padding-*` доступны четыре стороны.
Дополнительно: `--modal-max-width` (80rem), `--modal-duration` (.2s),
`--modal-closer-duration` (.15s), `--modal-easing` (ease-out).
Время закрытия вычисляется из CSS, включая пользовательские задержки перехода.
При портале переменные наследуются от `body`; переменные только на обёртке страницы
нужно передать через `style` или задать на `.x-react-modal`.

## useAppear

```tsx
'use client';

import { useAppear } from '@andreyshpigunov/x/react';

export function Feature() {
  const { ref, visible, appeared } = useAppear<HTMLElement>({
    rootMargin: '0px 0px 100px 0px',
    threshold: 0,
    once: false,
  });

  return <section ref={ref} data-visible={visible} data-appeared={appeared}>
    Содержимое доступно и на сервере.
  </section>;
}
```

- `ref` — стабильный callback ref на один наблюдаемый элемент.
- `visible` — последнее значение `IntersectionObserverEntry.isIntersecting`.
- `appeared` — был ли этот элемент видим хотя бы раз.
- `root`, `rootMargin`, `threshold` — параметры `IntersectionObserver`.
- `once: true` отключает наблюдение после первого пересечения; оба флага остаются `true`
  до смены элемента или перенастройки наблюдения.
- Замена DOM-элемента сбрасывает его состояние; размонтирование отключает наблюдатель.
- При SSR и первом клиентском рендере оба флага `false`.
- Без IntersectionObserver после монтирования оба флага `true`.

Хук сам не скрывает контент и не меняет классы. Не делайте важное содержимое
недоступным до JavaScript; анимацию добавляйте как улучшение существующей страницы.

## Остальные компоненты

Страница `/components` локального стенда содержит все примеры. CSS импортируется
отдельно: `styles/sheets.css`, `styles/dropdown.css`, `styles/slider.css`.
Autocomplete использует `styles/dropdown.css`. Эти файлы не меняют глобальные
стили и не подключают reset. Все компоненты экспортируются из `/react`.

| Модуль X | React API |
| --- | --- |
| modal | `Modal` |
| sheets | `Sheets` |
| dropdown | `Dropdown` |
| autocomplete | `Autocomplete<T>` |
| slider | `Slider` |
| appear | `useAppear` |
| loadmore | `useLoadMore<T>` |
| animate | `useScrollProgress` — прогресс для React-стилей и классов |
| scroll | `ScrollLink`; для слежения за разделами — `useAppear` |
| sticky | `useSticky` — состояние элемента с CSS `position: sticky` |
| hover | `useHover` — обработчики для одного или нескольких связанных элементов |
| device | `useMediaQuery` — размеры экрана, тип указателя и настройки пользователя |
| lazyload | `LazyImage` — нативный `loading="lazy"`, SSR-разметка сохраняется |
| form | Управляемые поля React: `value`, `checked`, `onChange`, `onSubmit` |
| typograf, lib | Обработка данных и утилиты; отдельного UI-компонента не требуют |

У DOM-модулей и хуков разные контракты: глобальные события, селекторы и имена
функций в HTML заменены явными параметрами и callbacks. Хуки не добавляют
классы на `html`, не перестраивают DOM и не регистрируют функции на `window`.
Это не обёртки над `x.init()`.

### Sheets

```tsx
<Sheets defaultValue="description" onValueChange={setTab} items={[
  { id: 'description', label: 'Описание', content: <Description /> },
  { id: 'details', label: 'Характеристики', content: <Details /> },
]} />
```

`value` + `onValueChange` дают управляемый режим; без `value` состояние локальное.
`defaultValue` задаёт начальную вкладку. Доступны `label`, `orientation`,
`className`, `style`; элемент может иметь `disabled`. `id` должны быть уникальны
внутри списка. Стрелки, Home и End переключают вкладки, пропуская недоступные.
Вложенные группы независимы. Панели остаются смонтированными и сохраняют формы.
X не задаёт оформление переключателей вкладок: его задаёт сайт.

### Dropdown

```tsx
<Dropdown trigger="Действия" items={[
  { id: 'edit', label: 'Редактировать', onSelect: edit },
  { id: 'separator', divider: true },
  { id: 'help', label: 'Помощь', href: '/help' },
]} />
```

`open`, `defaultOpen`, `onOpenChange` управляют открытием. `trigger` — содержимое
кнопки (не вкладывайте в него другую кнопку или ссылку). Элементы поддерживают
`disabled`, `keepOpen`, `href`, `onSelect`. Доступны `label`, `className`, `style`,
`disabled` для самой кнопки. Встроены клавиатурная навигация, Escape, закрытие при
уходе фокуса/клике снаружи и позиционирование у границ окна браузера.
Визуальные переменные `--dropdown-*` сохраняются, включая историческое написание
`--dropdown-backgroud-color`. `--dropdown-duration` задаёт переход (по умолчанию .15s).

### Autocomplete

```tsx
<Autocomplete<City> label="Город" value={query} onValueChange={setQuery}
  getLabel={city => city.name} getKey={city => city.id} onSelect={setCity}
  loadData={async (query, { signal }) => {
    const response = await fetch(`/api/cities?q=${encodeURIComponent(query)}`, { signal });
    if (!response.ok) throw new Error('Не удалось загрузить города');
    return response.json();
  }} />
```

Вместо `loadData` можно передать `items` для локальной фильтрации. `renderItem`
возвращает ReactNode, строковый HTML не вставляется. `getLabel` по умолчанию — String;
для объектов задайте свой. `debounce` по умолчанию 400 мс, `minLength` — 1.
Есть `loadingContent`, `emptyContent`, `errorContent`, `placeholder`, `name`,
`disabled`, `inputProps`, `className`, `style`. Управление value обязательное.
`inputProps` предназначен для остальных атрибутов поля, например required/type.
Запрос получает AbortSignal. Устаревшие результаты игнорируются даже если загрузчик
не поддерживает отмену. Стрелки выбирают предложение, Enter подтверждает,
Escape закрывает список. Уход фокуса не выбирает предложение автоматически.
После выбора вызываются `onValueChange(getLabel(item))` и `onSelect(item)`.

### Slider

```tsx
<Slider gap={12} resetOnMouseout={false} label="Фотографии товара">
  {photos.map(photo => <a key={photo.id} href={photo.href}>
    <LazyImage src={photo.src} alt={photo.alt} width={800} height={600} />
  </a>)}
</Slider>
```

На компьютере положение мыши выбирает слайд, как в X; на сенсорном экране — свайп.
Стрелки, Home и End работают при фокусе на контейнере. `value`, `defaultValue`,
`onValueChange` позволяют добавить собственные кнопки управления. По умолчанию
`gap=0`, `rubber=true`, `resetOnMouseout=true`, `touch=true`. Доступны `label`,
`className`, `style`. CSS-переменные `--slider-*` сохраняются; `--slider-duration`
задаёт длительность перемещения (.25s). Геометрия пересчитывается CSS при resize.
React сохраняет обработчики и состояние внутри слайдов. Неактивные слайды inert.
При сокращении списка отображается ближайший допустимый слайд; в управляемом
режиме при необходимости обновите `value` в родителе. Используйте стабильные key.
Изображения передавайте с обычными src/srcSet; `data-src` не обрабатывается.
Загрузка изображений остаётся под контролем React/Next.js, без клонирования DOM.

### Подгрузка и служебные хуки

```tsx
const feed = useLoadMore<Post>({
  resetKey: category,
  loadPage: async (page, { signal }) => {
    const response = await fetch(`/api/posts?page=${page}&category=${category}`, { signal });
    if (!response.ok) throw new Error('Не удалось загрузить');
    return response.json(); // { items: Post[], hasMore: boolean }
  },
});
return <>
  {feed.items.map(post => <PostCard key={post.id} post={post} />)}
  <div ref={feed.ref} />
  <button onClick={() => void feed.loadMore()} disabled={feed.loading || !feed.hasMore}>
    {feed.error ? 'Повторить' : 'Загрузить ещё'}
  </button>
</>;
```

`useLoadMore`: `initialPage=1`, `root`, `rootMargin='0px 0px 400px 0px'`,
`enabled=true`. Пока маркер виден, загружает страницы последовательно до `hasMore=false`.
При ошибке останавливается до ручного повтора. Возвращает `items`, `loading`,
`hasMore`, `error`, `loadMore`, `ref`. Изменение `resetKey` сбрасывает данные и
отменяет старый запрос. Несколько лент работают независимо.

- `useScrollProgress({root, start: '100%', end: 0})` возвращает `ref` и прогресс 0…1.
  Границы — пиксели, проценты высоты контейнера или vh. Передавайте прогресс
  в React style/className; хук освобождает scroll/resize/ResizeObserver при удалении.
- `useSticky({root, rootMargin: '-1px 0px 0px 0px'})` возвращает `ref`, `stuck`.
  Как в X, определяет состояние по intersectionRatio < 1. Для примера используйте
  `position: sticky; top: -1px`; при других отступах настройте rootMargin.
- `useHover()` возвращает `hovered`, `bind`; `<div {...bind}>` отслеживает указатель,
  игнорируя touch. Один bind можно использовать для связанных элементов.
- `useMediaQuery(query, serverValue=false)` подписывается на matchMedia; первый
  рендер совпадает с SSR. Используйте, например, `(min-width: 768px)` или `(pointer: coarse)`.
- `ScrollLink` принимает обычные атрибуты ссылки, `href="#id"`, `offset=0`,
  `behavior='smooth'`. Учитывает reduced motion, фокус и историю; модифицированные
  клики и внешние ссылки оставляет браузеру.
- `LazyImage` принимает атрибуты img, по умолчанию `loading='lazy'`. Для важного
  первого изображения задайте `loading='eager'`. В Next.js можно использовать
  штатный Image вместо LazyImage.

## Совместное использование

Не вызывайте старые DOM-компоненты для разметки, которой управляет React.
В next-cms сохраняйте штатные Picture/next/image, типографику и административные
компоненты. X выбирается отдельно для публичного шаблона; готовую стороннюю вёрстку
не требуется переводить на полный CSS X.

Автоматические проверки WebKit не заменяют ручную проверку реального iPhone/Safari.
