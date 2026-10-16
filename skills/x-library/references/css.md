# CSS-система X

Источник: реальные правила `src/components/x/*.css`, сборка `src/css/x.css`; комментарии cheatsheet могут отставать. Содержание: подключение/слои, адаптивность, сетка/утилиты, компоненты, настройки. Полный индекс переменных — [css-variables.md](css-variables.md).

## Подключение и каскад

Полный `@andreyshpigunov/x/x.css` задаёт reset и базовую типографику. Изолированные package exports существуют только для modal/dropdown/sheets/slider: `/styles/*.css`; это CSS из src/react с x-react-* селекторами, он не оформит vanilla .modal/[x-dropdown]. Для vanilla используй полный x.css либо собственную сборку нужных исходных CSS с variables. Не придумывай `/styles/grid.css` и другие exports. Исходный CSS с @for/@each требует PostCSS-сборки; это не готовый CSS для браузера.

Порядок реальных импортов и слоёв: variables, reset, space, typo, links, form, buttons, grid, flex, flow, dropdown, sheets, slider, sticky, modal, scroll, icons, app, lib, colors. debug отключён. app.css библиотеки создаёт `.app {position:relative}`; стили приложения хранятся отдельно. У обычных правил без слоя приоритет выше layered-правил; поздний слой выше раннего при обычных декларациях. Не исправляй любой конфликт повышением specificity/important: сначала проверь слой, подключение и переменную.

В `:root` `--font-size-base:62.5%`, `--font-size:1.6rem`, `--font-scale:1`, шрифты/цвета/контейнер. Изолированные React CSS не меняют корневой размер. Менять масштаб всего html ради одного компонента не нужно.

## Адаптивность

Префиксы в HTML буквально `s:`, `m:`, `l:`, `xl:`; min-width 640, 768, 1024, 1280 px. Пример: `class="grid g1 m:g2 l:g3 gap4"`. В CSS-селекторе двоеточие экранируется (`.m\:g2`), в HTML — нет. Наличие одного адаптивного семейства не доказывает наличие всех: проверяй нужный селектор в собранном CSS.

## Сетка, поток, отступы

| Семейство | Семантика |
| --- | --- |
| `.grid.gN` | N колонок, 1…12; базовая grid по умолчанию 12. Прямой ребёнок `.cN` занимает N колонок. `.cA/B` — линии A…B включительно, НЕ дробная ширина. |
| `.flex.fr/.fc/.fw/.fnw` | Строка/колонка/wrap/nowrap. `.ais/.aifs/.aic/.aife` — align-items; `.jcfs/.jcc/.jcfe/.jcsb/.jcsa/.jcse` — justify-content. |
| `.flex > .cA/B` | Доля A/B от ширины (flex-basis и max-width); в отличие от grid. Gap не вычитается автоматически из процентных долей: проверь переполнение. |
| `.flow.sN` | Обнуляет margin прямых детей и задаёт вертикальные отступы через --space-N; последний ребёнок получает margin-bottom:0. |
| `.spaceN` | Отдельный блок высотой --space-N. |
| `mN/mxN/myN/mtN/mbN/mlN/mrN` | Margin, N=0…10; отрицательный суффикс n (`mt4n`). ma/mxa/mya/mta/mba/mla/mra — auto. |
| `pN/pxN/pyN/ptN/pbN/plN/prN` | Padding, N=0…10. |
| `gapN/gapxN/gapyN` | Общий/column/row gap, N=0…10. |

Шкала --space-0…10: `0, .4, .8, 1.2, 1.6, 2.4, 3.2, 4.8, 6.4, 9.6, 12.8rem`. Это индексы токенов: p4 = 1.6rem, а не 4px/4rem. Не придумывай p11/p12 по устаревшим комментариям.

## Утилиты

- `wN/maxN/minN`: **N rem**, N=2…38 шаг 2 и 40…160 шаг 10; например max64 отсутствует, max60 существует. Старый список w400/max800 в комментариях не отражает текущие правила. wmax/hmax=100%, wscreen/hscreen=100vw/100vh, fullscreen=оба размера viewport, max=max-width:100%.
- `tN/bN/lN/rN` и отрицательные `tNn` и т.п. используют --space-N, N=0…10; `zN` — z-index N. fix/rel/abs задают fixed/relative/absolute; inset задаёт inset:0, fill — absolute + top/left:0 + width/height:100%. fit-cover/fit-contain — object-fit. ins и fit-none в текущих правилах отсутствуют.
- `brN` — radius --space-N, N=0…10; br100=100%. `sh0` убирает тень, `sh1…5` используют --shadow-1…5; sh6…10 не определены. `oN` — order, `opN` — opacity; не путай.
- `fs10…19`, `fs20…100` шаг 2 — размер N/10 rem; `fw100…900` шаг 100; `ls0…4`, `lh0…9`. Адаптивные fs/fw/ls/lh — m/l/xl, не s.
- `al/ar/ac/aj` — выравнивание; mono/italic/strike/upper/lower/capitalize/nowrap/hyphens/**breakWord**; toe — однострочное многоточие, lc0…5 — line clamp.
- hidden — display:none; hidden-next скрывает следующий соседний элемент; invisible — visibility:hidden; **visuallyHidden** оставляет доступный текст в обрезанном блоке 1px. block/inline/**inlineBlock**/table задают display; oh — overflow:hidden; unselectable — user-select:none, unclickable — pointer-events:none (не настоящий disabled). touch-show/touch-hide зависят от класса html.touch, выставляемого device.init; no-print скрывает при печати. kebab-case visually-hidden/inline-block/break-word из старых комментариев не являются этими классами.
- ratio1x1/2x1/3x1/4x1/3x2/4x3/16x9 и обратные — готовые пропорции; **iconN**: N=10…60 шаг 2, адаптивность m/l (`icon24 m:icon32`), размер **N/10 rem**, не px и не icon.sN. .icon без числа = 1em; правила распространяются и на прямые svg/img.

## Компонентные стили

- `typo.css`: базовые заголовки, абзацы, списки, цитаты, таблицы; классы h1…h6. `links.css`: link/hover/active и link_noline/underline/dashed/dotted/wavy. Переопределяй --link-*.
- `buttons.css`: button (также автоматически [type=submit]), button_label, button_spacy, button_link/button_inline, button_primary/success/warning/danger/white/black/clear/dropdown, buttons-group. Семейства --button-* в индексе; используй существующую структуру, не придумывай btn-*.
- `form.css`: штатные input/textarea/select и обёртки, переменные --form-* (точные доступные имена смотри в индексе). Не обещает JS-валидацию/отправку формы.
- `colors.css`: color-*/bg-* для primary/success/warning/danger/error/black/white/grey/current. Не достраивай произвольные оттенки.
- modal/dropdown/sheets/slider CSS соответствует структуре, которую создаёт vanilla, либо отдельным x-react-* классам адаптера. Два DOM-контракта не взаимозаменяемы.
- sticky.css даёт position:sticky; scroll.css — scroll, scroll_x/scroll_y, scroll_contain, scroll_x-proximity/scroll_x-mandatory и scroll_align-center/scroll_align-end для дочернего snap-align. Это CSS, а прокрутка по якорю — JS scroll/React ScrollLink.
- debug.css предназначен для отладки и не подключается полной сборкой по умолчанию.

## Настройки

Сначала переопредели штатную custom property на правильном узле; затем используй собственный класс, если токена нет. Значение `--dropdown-backgroud-color` пишется именно с опечаткой. Для модалки, вынесенной в body, переменная родителя страницы не наследуется: ставь на #id/class корня или React style.

[Индекс переменных](css-variables.md) показывает реальные объявления и var()-ссылки по файлам, включая значения по умолчанию. Некоторые переменные только потребляются с fallback, некоторые задаются в конкретном селекторе. Перед переопределением проверь селектор и каскад исходника; таблица не означает, что любой токен глобален или имеет одинаковый default во всех компонентах.

## Неоднозначности и границы CSS API

- Селекторы `[class*=grid]` и `[class*=flex]` смотрят на подстроку всего class-атрибута. Они задают структуру/правила детей, но сами не включают display:grid/flex; нужен `.grid`/`.flex` или их реально существующий адаптивный display-класс. Имена вроде product-grid тоже попадают под этот селектор. grid использует dense auto-flow, поэтому визуальный порядок может отличаться от DOM.
- В grid c2/4 означает `grid-column:2 / 5` (три колонки), во flex c2/4 означает 50%. Диапазон grid должен помещаться в выбранные gN, иначе создаются неявные колонки. jss/jse/jsc/jsstr и ass/ase/asc/asstr управляют justify-self/align-self. Во flex есть no-shrink/no-grow. Адаптивность этих дополнительных классов не достраивай автоматически.
- `lsN = .1em * N`, `lhN = 1.N`, `opN = N/10`, `oN = N` (0…10 для последних двух). lc0 — сгенерированное значение line-clamp:0, не документированный сброс clamp. Дополнительные базовые утилиты: antialiased и container (max-width из --container-max-width, margin:0 auto, без автоматических боковых padding).
- ratio-классы задают position:relative, aspect-ratio и overflow:hidden; перечисленные в lib.css дочерние media/a становятся absolute и заполняют контейнер. object-fit:cover не добавляется автоматически: при необходимости укажи fit-cover на img. Адаптивные ratio-правила меняют пропорцию; используй базовый ratio-класс для общей структуры.
- reset применяет масштаб html через `calc(var(--font-size-base) * var(--font-scale))`: scale5n…scale1n/scale0/scale1…scale5 на html дают 0.75…1.25 с шагом .05. Это влияет на все rem, включая иконки. В reset есть `[hidden] {display:none!important}` и `.no-transitions * {transition:none!important}` внутри html; поддерживается также alias noTransitions; lib.transitionsOff/On управляют обоими именами — см. javascript.md.
- form.css не предоставляет универсальный компонент .field и не стилизует radio/checkbox как текстовые поля. Состояния readonly/disabled/focus/error и `[pattern]:invalid` реализованы CSS. Для textarea height:auto; max-width полей/кнопок = --form-width. Селектор input[type=datetime-local] не входит в основной перечисленный набор, не считай его автоматически идентичным input[type=date].
- --modal-max-width, --modal-color, --modal-duration, --modal-easing, --modal-closer-duration — возможности React CSS. Vanilla modal-window имеет max-width:80rem, поэтому ширину задавай data-window-class (например max60 при полном CSS) или собственным правилом .modal-window; длительности vanilla задаются правилами CSS и фиксированными ожиданиями JS. --dropdown-duration и --slider-duration также не регулируют vanilla-вариант. Общие имена --modal-*/--dropdown-* не означают одинаковый набор токенов двух реализаций.
- Полный x.css сам по себе не содержит x-react-* стили. Изолированные React CSS содержат локальные defaults/fallback и отдельные необходимые правила вроде box-sizing; импорт полного CSS не заменяет /styles/*.css для React. Дефолты, объявленные на корне компонента, перекрывают унаследованные значения предка: для надёжной настройки задавай style или класс именно корню компонента, с учётом порядка CSS.
