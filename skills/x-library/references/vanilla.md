# Vanilla X: API, callbacks и жизненный цикл

Проверено по локальным исходникам X 0.6.0-beta.1 с исправлениями жизненного цикла. Старый архив с тем же номером версии может не содержать x.destroy, signal и остальные исправления; сверяй фактически установленный код/архив. Содержание: подключение; modal; dropdown/autocomplete; sheets; loadmore; animate/appear; остальные модули. Для утилит и форм читай [javascript.md](javascript.md), для оформления — [css.md](css.md). Если комментарий в исходнике расходится с телом метода, ориентируйся на реализацию.

## Подключение и повторная инициализация

Корень пакета экспортирует `X`, `x` и singleton-модули `modal, animate, appear, lazyload, loadmore, sheets, dropdown, autocomplete, scroll, hover, device, form, sticky, slider, lib, typograf`. Браузерная сборка устанавливает `window.x`, `x.id`, `x.qs`, `x.qsa`; `x.render` — bound `lib.render`. Не считай эти shortcuts отдельными именованными экспортами.

`x.init(): void` вызывается после появления DOM и только один раз: флаг `x.initialized` блокирует следующие вызовы. Порядок: device → modal → animate → appear → lazyload → loadmore → sheets → dropdown → scroll → sticky → slider → hover. Autocomplete настраивается отдельно, typograf.live запускается явно; form не требует init. `x.destroy(): void` снимает подписки всех модулей (включая form и typograf), уничтожает autocomplete с reset:false и сбрасывает initialized; после него x.init запускает новый цикл. Если callback во время init вызывает destroy, текущий проход прекращается. Повторный x.init внутри уже выполняющегося init ничего не делает; внутри x.destroy также игнорируется — новый цикл запускай после возврата destroy. После добавления DOM вызывай init нужного модуля; это часто переинициализация всех его элементов, а не одного узла. У перечисленных UI-модулей есть destroy; у lib общего destroy нет. destroy отменяет принадлежащие модулям отложенные операции; это не универсальный откат DOM: modal сохраняет преобразованную структуру, lazyload — загруженные атрибуты, appear — классы. Настройки singleton сохраняются. Подписки приложения через addEventListener снимает само приложение; самостоятельные lib.deferred/onAppear требуют своей очистки.

## Modal

Разметка: `<div x-modal="contact" class="modal_hash" data-window-class="max60">…</div>` и `<button x-modal-open="contact">Открыть</button>`.

- `modal.init(): void`, `destroy(): void`.
- `show(id: string): Promise<void>`: bare id без `#`. **Повторный show активной модалки закрывает её**. При текущем animation lock вызов пропускается, не ставится в очередь.
- `hide(id): Promise<void>`, `hideAll(): Promise<void>`, `isActive(id): boolean`.
- `modal_uniq` закрывает остальные перед открытием; `modal_hash` обновляет hash. Эффекты задаются штатными классами CSS (`modal_effect-in/out/up/down/left/right`), не React prop.

Преобразование DOM в `_renderModalContents`: читает `[x-modal]`, создаёт новый `<div id="contact" class="modal …">` в первой `.modal-here` или body; копирует классы исходника, переносит `data-window-class` на `.modal-window`, вставляет исходный innerHTML внутрь `.modal-overlay` + `.modal-outer > .modal-inner > .modal-window` с `.modal-rail > .modal-close`; исходный элемент удаляет. Произвольные атрибуты исходника не копируются. Проверка id пропускает буквы/цифры/`_`/`-`; поиск экранируется через CSS.escape, включая числовые id; существующий `#id` блокирует преобразование (не ставь одновременно такой id на шаблон).

После init ищи `#contact`, а не `[x-modal="contact"]`. Ссылки на старые узлы и назначенные им обработчики утрачиваются; назначай обработчики на созданное содержимое после init либо делегируй. Учитывай смену CSS-наследования/родителя. `destroy()` снимает обработчики, но не возвращает исходный шаблон.

События на **созданной модалке**, без bubbles и без detail: `modal:ready` после ready и задержки 10 ms, до active; `modal:open` после active и ожидания 200 ms; `modal:close` после удаления active с ожиданием 200 ms. Это фиксированные ожидания JS, не обещание окончания любой пользовательской CSS-анимации. Подписка `document.addEventListener` без capture их не поймает. Нет callbacks `onOpen/onClose` в vanilla API.

```js
x.modal.init();
const dialog = document.getElementById('contact');
dialog.addEventListener('modal:open', () => dialog.querySelector('input')?.focus());
await x.modal.show('contact');
```

## Dropdown

Контейнер содержит `[x-dropdown-open]` и меню `[x-dropdown]`. `dropdown.init()`, `destroy()`, `closeAllDropdowns()` возвращают void. Публичных `show(id)/hide(id)` нет: `_open/_close` — внутренние методы. Открытие инициирует штатный trigger (клик/фокус согласно его типу).

Init назначает ARIA, id меню при его отсутствии и tabindex элементам. Состояние хранится на родителе: `dropdown_ready`, `dropdown_open`, `dropdown_right`, `dropdown_bottom`; trigger получает active. События на родителе, без bubbles/detail: `dropdown:ready`, `dropdown:beforeshow`, `dropdown:aftershow`, `dropdown:beforehide`, `dropdown:afterhide`. `aftershow` вызывается после добавления open через 20 ms; `afterhide` — после 200 ms удаления. Не интерпретируй aftershow как transitionend. Подпишись до init, если нужен ready.

## Autocomplete: не путать с React-контрактом

`autocomplete.init(dropdownId, options): void` заменяет прежний экземпляр с reset:false. `get(id)` возвращает экземпляр или null; `destroy(id = null, {reset = true} = {}): void` удаляет один либо все. Идентификатор относится к **родителю** input `[x-dropdown-open]` и списка `[x-dropdown]`. Сначала инициализируй dropdown, затем autocomplete: dropdown.init выставляет роли menu, а autocomplete заменяет их combobox/listbox.

| Option / callback | Фактический контракт |
| --- | --- |
| `loadData(ctx, {signal})` | Возвращает данные либо Promise данных; ctx — экземпляр с field, list, dropdown, dropdownId, data. Запрос читай из `ctx.field.value`. Второй аргумент содержит AbortSignal; передавай его в fetch. Старые callbacks с одним аргументом совместимы. |
| `mapData(data)` | Синхронно преобразует ответ loadData в массив; результат не await-ится. |
| `renderItem(item, index, array)` | Получает item/index/array текущего прохода Array.map, возвращает HTML-строку. После отмены/удаления экземпляра оставшиеся renderItem не вызываются. Выбираемый узел обязан иметь `data-item` с JSON объекта. Экранируй отдельно HTML-текст и JSON внутри HTML-атрибута. |
| `onSelect(item)` | При выборе получает JSON.parse(data-item); при автоподстановке на blur — `data[0]`. Возврат игнорируется, Promise не ожидается; сам обнови поле/модель. |
| `resetFunc()` | Вызывается при сбросе, включая пустой ввод, ошибку и destroy с reset:true; возврат игнорируется. |
| `selectFirstOnBlur` | По умолчанию true; false предотвращает выбор первого, но при закрытии может вызвать resetFunc. Escape подавляет автоподстановку. |
| `data` | Начальное поле экземпляра, не эквивалент React items и не готовая локальная фильтрация: init/reset могут очистить его. Для локального поиска дай loadData. |
| `emptyStateHtml/defaultStateHtml/loadingStateHtml` | HTML-строки состояний. Отдельного error callback/content нет: ошибка логируется и выполняется reset. |

Debounce фиксирован 400 ms; опций debounce/minLength нет. Старые ответы игнорируются счётчиком, их signal прерывается при новом запросе/вводе, reset и destroy. Сеть отменяется только если callback передал signal в fetch; Promise callback, игнорирующего сигнал, сам по себе не завершается. `get(id).render()` рисует текущее data; не вызывай приватные `_loadData/_reset`. Выбор клавиатурой и мышью требует data-item. renderItem не возвращает DOM/ReactNode.

## Sheets

Контейнер `[x-sheets]`, кнопки `[x-sheet-open="a"]`, панели `[x-sheet="a"]`. `init()/destroy(): void`; `show(value: string, {silent=false, source='api', container?}): void`. container — DOM-контейнер, полезен при повторяющихся именах вкладок; не CSS-строка. Значения — буквы/цифры/`_`/`-`. Переключает active, не превращает x-sheet в id. Вложенные группы изолированы по ближайшему [x-sheets]; переключение родителя сохраняет выбор дочерней группы. Клавиатурного/ARIA-контракта React-вкладок vanilla не предоставляет.

События всплывают, cancelable:false, на контейнере:
- `sheets:ready`: detail `{container, timestamp, initialized:true}`.
- `sheets:selected`: `{sheet, tab, content, container, previousSheet, previousTab, previousContent, wasActive, source, timestamp}`. Срабатывает даже при повторном выборе; wasActive:true. silent:true подавляет selected.
- `sheets:destroy`: `{container, timestamp, wasInitialized:true}`.

Init может вызвать selected до ready. destroy из selected/ready прекращает текущую инициализацию; повторное подключение после destroy работает. Во время синхронной рассылки sheets:destroy повторные init/destroy игнорируются: запускай новый цикл после возврата destroy. destroy посылает событие только контейнерам, найденным через зарегистрированные кнопки, и оставляет active-классы. По умолчанию первая вкладка автоматически не выбирается: init синхронизирует уже имеющую active кнопку. Задай исходный active либо вызови show. В обработчике selected не вызывай снова show без silent/проверки: получится рекурсия.

## Loadmore

`<div x-loadmore='{"functionName":"loadPosts"}'></div>`. `init()/destroy()/reset(selector): void`.

`window.loadPosts = async (page, {signal}) => boolean`: page начинается с 1; строго true увеличивает страницу, строго false прекращает наблюдение. undefined/другое значение не продвигает страницу. Callback сам загружает и вставляет HTML; модуль не рендерит данные. Ошибка перехватывается без автоматического error callback и без гарантированного повтора. AbortSignal прерывается при reset/destroy/переинициализации; передавай signal в fetch и проверяй signal.aborted перед вставкой HTML. Один маркер защищён от параллельных вызовов, разные могут работать одновременно.

Init сохраняет существующий id маркера и создаёт его только при отсутствии. `reset(selector)` прерывает прежний signal, заменяет состояние на page=1/loading=false и снова наблюдает маркер, в том числе после false. Содержимое не очищает; новый callback может начаться до завершения старого, если тот игнорирует сигнал. Устаревший результат не меняет новое состояние. Observer: rootMargin `0px 0px 400px 0px`, threshold 0; пока элемент непрерывно виден, повторные страницы не гарантированы (в React это реализовано отдельно).

functionName читается как `window[functionName]`: строка `app.loadPosts` не означает обход window.app.loadPosts. Предпочитай простое глобальное имя; регистрация внутри ES module без window не работает.

## Animate и Appear

`animate.init()/destroy()`. `[x-animate]` содержит JSON: `{trigger?, parent?, start, end?, class?, classRemove?, functionName?, log?}`. trigger/parent — селекторы, fallback элемент/window; classRemove=true, log=false. start/end задают пороги положения верха trigger относительно parent; числа/числовые строки — px, проценты — высота parent, vh — высота viewport. Числовой end=0 поддерживается; отсутствие/null означает отсутствие конечного порога. functionName резолвится через window[name].

`callback(item): void` вызывается при изменении progress; при одном start — один раз для первоначальной стороны порога и затем на переходах через границу (включая начальный progress=0 до достижения start). item содержит element, trigger, parent, start/end, class/classRemove, functionName, progress (ЧИСЛО 0…1), duration при двух порогах и внутренние флаги. Возврат/Promise игнорируются; callback вызывается как fn(item), без привязки к window/element, синхронная ошибка не ловится и может прервать текущий scroll-проход. Найденная функция кешируется в item.fn до переинициализации. Не копируй старый JSDoc, где progress ошибочно назван строкой. Для CSS используй `item.element.style.setProperty('--progress', String(item.progress))`.

`appear.init({appearedClass='appeared', visibleClass='visible', once=false, root=null, rootMargin='0px', threshold=0})`, `destroy()`. Наблюдает `[x-appear]`; init объединяет настройки с прежними. Добавляет appeared при первом появлении и visible на время видимости. События `visible/invisible` на элементе, без bubbles, detail `{appeared:true}`; once снимает наблюдение при первом пересечении независимо от appearedClass, включая отключённый или уже установленный класс. Callback options нет: используй события либо lib.onAppear.

## Остальные модули

| Модуль | Контракт и нюансы |
| --- | --- |
| `lazyload` | init/destroy. `[x-lazyload]` на img; data-src/data-srcset после предзагрузки становятся src/srcset и удаляются, добавляется loaded. rootMargin 200px, threshold .1. При ошибке unobserve; onLoad/onError options нет. Для обычной картинки достаточно нативного loading=lazy; для Next — его Image/Picture. |
| `slider` | init/destroy/observeSliders/initSlider(element). JSON в x-slider: gap=0 (px), rubber=true, resetOnMouseout=true, touch=true. Переносит исходные дочерние элементы во wrapper, сохраняя DOM-идентичность и обработчики; создаёт индикаторы. destroy возвращает исходные childNodes, классы слайдов и стили контейнера, включая ветку одного слайда/touch:false. Загруженные src/srcset и loading не откатывает. Не добавляй несуществующие next/prev/onChange. Повторный init/observeSliders безопасно сканирует новые элементы, используя один IntersectionObserver; MutationObserver также замечает добавление и очищает удалённые экземпляры и ещё не инициализированные наблюдаемые узлы. Повторная вставка удалённого слайдера позволяет наблюдать его заново. Новые слайды внутри уже созданного slider требуют destroy → init. |
| `scroll` | init/destroy; `scrollTo(targetOrOptions): Promise<void>`, alias `to`. Строка — CSS-селектор (для id передай '#id'), либо HTMLElement, либо `{target, parent?, offset?, hash?}`. Свойства parent, offset=0, classActive='active', hash=false; init задаёт parent=window, если parent не задан. Атрибут `x-scrollto="#section"` либо JSON `{target:"#section",parent?,offset?,classActive?,hash?}`; href сам по себе не заменяет x-scrollto. Smooth scroll; Promise ждёт фиксированные 400 ms, не scrollend. Callback completion нет. |
| `sticky` | init/reset/destroy; ищет `.sticky`, не `[x-sticky]`. activeClass='sticky_on', rootMargin='-1px 0px 0px 0px' — публичные поля; задавай до init. События sticky:on/off всплывают, detail нет. Отслеживает intersectionRatio<1: это не универсальный датчик приклеивания. Нужен CSS position:sticky. |
| `hover` | init/destroy, делегированные mouseenter/mouseleave. Синхронизирует класс hover между `[x-hover]` с одинаковым непустым href, не по значению x-hover. |
| `device` | init/destroy; поля js, os, browser, device, mobile, touch, width, height, breakpoint, size (объект boolean-флагов текущего диапазона, не всех min-width сразу). Breakpoints xs<640, s≥640, m≥768, l≥1024, xl≥1280. На window `breakpointchange`, detail `{prev,current,width,height}` после debounce 200 ms и только при смене диапазона. Для адаптивного вида предпочтительнее CSS/media query. |

Не добавляй callback-настройку только потому, что она привычна по другой библиотеке. Если у X есть событие — подписывайся addEventListener и снимай подписку; если нужен другой контракт — используй собственный обработчик браузерного API.

## Практические ограничения жизненного цикла

### Singleton и импорт

`new X()` создаёт только новую оболочку с собственным initialized, но использует те же singleton-модули — не даёт изоляцию нескольких приложений. Классы Device/Hover/Slider экспортируются из своих исходных файлов, но **не** корневым index.js и не разрешёнными package subpaths; не предлагай `import {Slider} from '@andreyshpigunov/x'`. Root import в текущем коде проходит без DOM, однако браузерные действия некоторых методов требуют DOM. В React для компонентов всё равно используй /react. Package /x.js — браузерный bundle с window.x; для именованных ESM-импортов используй корень. /styles/*.css содержит именно React CSS, а не отдельные vanilla-компоненты.

### Modal: состояние и события

Клик .modal-close или вне .modal-window закрывает окно; vanilla не имеет настроек closeOnEscape/closeOnBackdrop, focus trap/initialFocusRef/returnFocusRef. Escape закрывает последнюю открытую модалку из внутреннего стека, независимо от порядка DOM; произвольный внешний z-index не учитывается. Не обещай React-доступность vanilla-модалке.

modal_hash использует replaceState и при init открывается по совпадающему hash во время обхода соответствующего x-modal-open trigger; отдельного hashchange listener нет. Init сначала выполняет destroy: отменяет pending show/hide, снимает active/ready/z-классы, html-блокировку и обработчики, затем подключается заново. Отменённые Promise завершаются без позднего open/close, включая случай уже сработавшего таймера с ещё ожидающим продолжением Promise. hideAll прекращает свой обход при destroy и не закрывает окна нового цикла. Разметка не откатывается, hash сохраняется, поэтому совпадающий modal_hash может открыться заново при init.

modal:ready вызывается при animation lock; повторные операции в нём пропускаются. Перед modal:open/close lock уже освобождён, поэтому в open можно синхронно вызвать hide, а в close — show. Перед close уже очищены html-классы и обновлён стек. При destroy терминальные события не генерируются. ready-событие не cancelable: preventDefault не отменяет действие. При необходимости дождаться вызванной из callback операции сохраняй её Promise: исходный show её автоматически не await-ит.

### Dropdown и Autocomplete

Dropdown init добавляет `.dropdown` родителю; `[x-dropdown]` должен быть его прямым ребёнком для штатного CSS. Для штатного меню используй `li > a`; именно им автоматически назначаются role=menuitem/tabindex. Для input/textarea открытие по focus, закрытие после blur-таймера 200 ms и затем close-перехода 200 ms. Для остальных trigger click/Enter/Space проходит throttle 400 ms; ArrowDown/Up открывают и фокусируют пункт. Обычный click trigger не вызывает preventDefault: у button явно type=button, у ссылки учитывай её навигацию.

Клик вне trigger закрывает меню, в том числе обычный клик по пункту; `.dropdown_stay` внутри `[x-dropdown]` исключает это закрытие (vanilla-аналог keepOpen, но не React prop). `.dropdown_wrap` на родителе разрешает перенос строк; `li.divider` оформляет разделитель. disabled исключается из клавиатурного обхода по атрибуту [disabled]; произвольный aria-disabled или CSS-класс не равен полноценному disabled-контракту.

closeAllDropdowns возвращает void и запускает закрытие с afterhide после 200 ms. destroy синхронно отменяет переходы, blur/throttle-таймеры и подписки; поздние aftershow/afterhide не приходят. Восстанавливает сохранённые ARIA/id/tabindex и исходное наличие .dropdown; удаляет служебные классы открытого меню/trigger; повторный init сначала очищает старый цикл. Открытие во время закрытия отменяет старое закрытие. destroy из dropdown:ready останавливает текущую инициализацию и снимает уже назначенные подписки. При совместном teardown уничтожай autocomplete до dropdown (x.destroy делает это автоматически).

Autocomplete callbacks loadData/mapData/onSelect/resetFunc вызываются как методы экземпляра: обычная функция получает this=instance; renderItem получает аргументы Array.map без привязки this. Не завязывай интеграцию на this: передавай ctx в loadData и замыкай другие зависимости. mapData/renderItem должны быть синхронными. Если callback уничтожил/заменил экземпляр, старый результат больше не записывается в DOM. resetFunc вызывается после очистки data и отрисовки defaultState; при destroy — после снятия подписок/восстановления ARIA, пока field/list ещё доступны в this. Созданный из resetFunc новый экземпляр сохраняется в менеджере; старый destroy не удаляет его. Ошибка loadData/mapData/render во время загрузки логируется и сбрасывает состояние; прямой вызов instance.render() не имеет внешнего catch. Синхронная ошибка onSelect при явном выборе попадает в catch с неточным сообщением «error parsing data-item JSON», а выбор первого из afterhide вызывает onSelect без этого catch. rejected Promise callbacks модуль не обрабатывает.

`selectFirstOnBlur` фактически реагирует на **dropdown:afterhide**, не только собственно blur. Поэтому закрытие меню извне также может выбрать первый элемент. resetFunc не обязан менять field: модуль сам не очищает и не заполняет value. Enter всегда preventDefault и blur, даже без активного пункта; при true поздний afterhide может выбрать первый. Escape в открытом списке подавляет автоподстановку, и останавливает всплытие Escape: родительская модалка тем же нажатием не закрывается.

`autocomplete.destroy(null,{reset:false})` удаляет все экземпляры без вызова resetFunc/defaultState; через менеджер предпочтительнее, чем instance.destroy, иначе запись останется в instances. init(id,options) возвращает void, не instance — после него вызывай get(id). Непустое предварительное поле само по себе не запускает загрузку до focus, кроме случая, когда оно уже сфокусировано при init.

### Slider

Слайды — прямые дочерние элементы-обёртки с вложенным img; `querySelector('img')` не находит сам слайд, если он является img. Для ≥2 слайдов исходные узлы переносятся во wrapper, обработчики сохраняются; destroy возвращает те же узлы в исходном порядке. Не используй vanilla slider для React-содержимого. Новые слайды внутри уже созданного wrapper не становятся автоматически частью массива slides.

Один слайд — без wrapper/индикаторов: сохраняется исходное состояние классов, добавляются slider-item active и eager на первую вложенную картинку; destroy восстанавливает классы. Для ≥2 первая картинка загружается сразу, остальные при первом hover/touch; преобразование относится к первому вложенному img каждого слайда, не всему picture/source/srcset-дереву. Изображения после destroy остаются загруженными. Снимаются собственные mouse/touch/resize/transitionend/load-обработчики и pending RAF.

Определение touch — `'ontouchstart' in window`, не device.touch (coarse pointer). touch:false на touch-устройстве оставляет первый слайд без интеракций; на desktop не отключает mouse hover. rubber влияет на сопротивление границам при свайпе; порог смены — 10% ширины слайда+gap, вертикальное движение не переключает. Desktop выбирает индекс по положению курсора, mouseleave при resetOnMouseout возвращает 0. Индикаторы — не кнопки. Конфиг читается один раз при initSlider; boolean-поля преобразуются Boolean, поэтому строка "false" даст true — передавай JSON boolean. Gap приводится к Number; отрицательный/NaN/Infinity заменяется 0. Скорость движения в vanilla JS фиксирована transform .25s, --slider-duration относится к React.

### Scroll, Sticky, Appear и фоновые операции

- scroll.to/scrollTo без init использует window при отсутствии заданного parent; в SSR возвращает завершённый Promise. classActive применяется к ссылке **и target** при пересечении линией в 1/4 высоты viewport/parent, не центра, и не управляется параметром scrollTo. Прямой scrollTo не создаёт наблюдение за новой ссылкой. Строковые селекторы проходят ограничивающую regex, не любой валидный CSS поддержан; для сложного случая передавай HTMLElement. destroy очищает active-классы зарегистрированных ссылок/targets и завершает ожидающие Promise. Это отмена JS-ожидания, не остановка уже начатой нативной smooth-прокрутки.
- sticky.reset() снимает наблюдение, data-sticky-observed и прежний activeClass, но не подключает снова. init пересоздаёт observer с текущими rootMargin/activeClass; старые callback-записи игнорируются. Единственный `.m:sticky` без `.sticky` JS не найдёт.
- appear.destroy прекращает оставшуюся обработку текущего observer-batch, если вызван из visible/invisible. Сохраняет выставленные классы и накопленные настройки. visible/invisible зависят от смены visibleClass; если он отключён, событий не будет. detail.appeared=true — фиксированное значение, не вычисляемая гарантия первого появления. Настройки root/rootMargin/threshold — IntersectionObserver options, не отдельные x-appear JSON-настройки.
- lazyload.destroy отключает observer и pending Image-обработчики, снимает src/srcset предзагрузчика и завершает внутренние Promise отменой; поздний результат не меняет узел. Это не гарантия прекращения уже отправленного браузером сетевого запроса. Без IntersectionObserver fallback-загрузки нет. Повторный init наблюдает все ещё не loaded элементы, включая ранее ошибочные. Используй native loading=lazy, если нужен простой управляемый браузером путь.
- loadmore.destroy/reset/реinit прерывает signal и защищает внутреннее состояние от устаревшего результата. Внешний callback обязан сам учитывать сигнал перед DOM-вставкой; произвольную пользовательскую async-работу библиотека принудительно остановить не может.
- device.destroy снимает resize listener и свои html-классы, и отменяет pending resize debounce: позднего breakpointchange после destroy нет. resize обновляет width/height/breakpoint/size, не повторяет UA/touch-определение. html получает js, OS, browser, device, mobile/desktop и touch при coarse pointer; классы s/m/l/xl не добавляются.

- animate.destroy снимает pending window.load и requestAnimationFrame; callback старого цикла больше не исполняется; init/destroy из callback прерывает прежний проход по анимациям. hover.destroy удаляет выставленные им hover-классы, включая отсоединённые узлы.

## Асинхронная загрузка и отмена

```js
x.dropdown.init();
x.autocomplete.init('city-search', {
  loadData: async (ctx, { signal }) => {
    const response = await fetch('/api/cities?q=' + encodeURIComponent(ctx.field.value), { signal });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  },
  // renderItem должен вернуть HTML с корректно экранированным data-item;
  // mapData и onSelect задаются под формат приложения.
});

window.loadPosts = async (page, { signal }) => {
  const response = await fetch('/api/posts?page=' + page, { signal });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const data = await response.json();
  if (signal.aborted) return false;
  appendPosts(data.items); // синхронная вставка, реализованная приложением
  return data.hasMore === true;
};
// Перед удалением vanilla-страницы:
x.destroy();
```

AbortSignal — кооперативная отмена. Не перехватывай AbortError с последующим продолжением вставки; после собственного await вне fetch ещё раз проверяй signal.aborted. Внешние timers/listeners и глобальное window.loadPosts приложение удаляет самостоятельно. Отмена show/hide завершает Promise без результата и без терминального события; это не подтверждение, что окно открылось/закрылось штатным переходом.
