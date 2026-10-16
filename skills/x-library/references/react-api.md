# React: точные props и callback-контракты

Срез по `src/react/index.d.ts` и реализациям X 0.6.0-beta.1. При несовпадении установленной версии проверяй её types и exports. Примеры композиции и визуальные ограничения — [react.md](react.md).

## Правила callbacks

Управляемые Modal/Autocomplete требуют обновления state родителем. Sheets/Dropdown/Slider поддерживают controlled и uncontrolled режимы; наличие value/open (не undefined) включает controlled. defaultValue/defaultOpen применяются для начального состояния, а не для дальнейшего управления. Callback получает новое значение, **не DOM Event**. Внутренний (не экспортируемый) useControllable для Sheets/Dropdown/Slider подавляет повтор через Object.is; простое изменение controlled prop не является пользовательским callback-событием.

Callbacks изменения/выбора синхронно вызываются, их возвращаемые значения и Promise не используются как разрешение/запрет действия. Если нужна async-валидация, управляй состоянием снаружи. loadData/loadPage — исключение: их Promise ожидается. Нет React callbacks onBeforeOpen/onAfterClose, vanilla CustomEvent не является контрактом React.

## Modal

Обязательны `open:boolean`, `onOpenChange(next:boolean):void`, `title:ReactNode`. Остальные: description/children:ReactNode; closeLabel='Закрыть'; closeOnEscape=true; closeOnBackdrop=true; initialFocusRef/returnFocusRef:RefObject<HTMLElement|null>; effect='default'|'in'|'out'|'up'|'down'|'left'|'right'; className/windowClassName:string; style:CSSProperties с поддержкой `--${string}:string|number`.

Закрытие по Escape/backdrop/крестику просит `onOpenChange(false)`. Callback не сообщает окончание анимации. Открытие меняет родитель (`setOpen(true)`); нет imperative show/hide. Native dialog в портале после mount, содержимое остаётся смонтированным при закрытии. className — корень, windowClassName — окно. Не передавай произвольные HTML props как будто Modal распространяет их все.

## Sheets

`items:{id:string,label:ReactNode,content:ReactNode,disabled?:boolean}[]`; `value?:string`, `defaultValue?:string`, `onValueChange?(id:string):void`; label='Вкладки', orientation='horizontal'|'vertical', className/style. По умолчанию первый доступный id; при недоступном текущем отображается первый доступный. Не рассчитывай, что fallback сам обновит controlled state. Клавиатура стрелки по ориентации и Home/End; панели сохраняют состояние. Нет callback с previousSheet/Event как в vanilla.

## Dropdown

`trigger:ReactNode`, `items:DropdownItem[]`; open?:boolean, defaultOpen=false, onOpenChange?(boolean):void; label='Меню', disabled=false, className/style.

Item: id:string; label?:ReactNode; href?:string; disabled?:boolean; divider?:boolean; keepOpen?:boolean; **onSelect?():void без аргументов**. Сначала item.onSelect(), затем закрытие и фокус trigger, если !keepOpen. Promise не ожидается; return false не отменяет закрытие/навигацию. Для id замкни item в callback. Divider не выбирается. Trigger — содержимое встроенной кнопки, не готовая кнопка.

## Autocomplete<T>

Обязательные: label:string; value:string; onValueChange(text:string):void; onSelect(item:T):void.

Данные: items?:T[] (default []), **loadData?(query:string, {signal:AbortSignal}):Promise<T[]>**. При наличии loadData он приоритетнее локального items. Локальная фильтрация использует getLabel (default String), getKey?(item):string|number стабилизирует key; renderItem?(item):ReactNode отвечает только за представление, data-item JSON не нужен.

Настройки: minLength=1, debounce=400 ms, disabled=false; placeholder/name/className; style; loadingContent='Загрузка…', emptyContent='Ничего не найдено', errorContent='Не удалось загрузить'. inputProps поддерживает стандартные input props **кроме** value/defaultValue/onChange/onFocus/onBlur/onKeyDown/id/role/name/disabled/placeholder (ими управляет компонент).

При вводе onValueChange получает текст. При выборе последовательность: onValueChange(getLabel(item)) → onSelect(item) → закрытие списка. Сохраняй отдельно строку запроса и выбранный объект. При blur первый результат не выбирается. Загрузчик получает текущий value (не ctx.field и не автоматически trim-строку); eligibility проверяет value.trim().length. При смене запроса/закрытии списка вызывается controller.abort и результат игнорируется; сам HTTP-запрос прекращается лишь если loadData передал signal в fetch. Ошибка отображает errorContent; отдельного onError нет. Передавай signal дальше в fetch.

```tsx
const [query, setQuery] = useState('');
const [selected, setSelected] = useState<User | null>(null);
<Autocomplete<User> label="Пользователь" value={query}
  onValueChange={setQuery} onSelect={setSelected}
  getLabel={user => user.name} getKey={user => user.id}
  loadData={async (text, { signal }) => {
    const response = await fetch(`/api/users?q=${encodeURIComponent(text)}`, { signal });
    if (!response.ok) throw new Error('Не удалось загрузить пользователей');
    return response.json();
  }} />
```

## Slider

children:ReactNode; value?:number; defaultValue=0; onValueChange?(index:number):void; gap=0 px; rubber=true; resetOnMouseout=true; touch=true; label='Слайды'; className/style. Индекс начинается с нуля, callback не получает slide/Event. При mouseout сброс на первый включён по умолчанию. Если children сократились, отображаемый индекс ограничивается диапазоном, но controlled value согласовывает родитель. Никаких autoplay/loop/next/prev props нет.

## Hooks и простые компоненты

| API | Аргументы и результат |
| --- | --- |
| `useAppear<T>()` | `{root?:Element\|Document\|null,rootMargin='0px',threshold=0 (number или number[]),once=false}` → `{ref:RefCallback<T>,visible:boolean,appeared:boolean}`. once после первого появления сохраняет оба true и отключает observer. Это callback ref, не RefObject с current. |
| `useLoadMore<T>(options)` | loadPage обязателен; прочие initialPage=1, root=null, rootMargin='0px 0px 400px 0px', resetKey?:unknown, enabled=true. Возвращает `{ref,items:T[],loading:boolean,hasMore:boolean,error:unknown,loadMore:()=>Promise<void>}`. |
| `useScrollProgress<T>()` | `{root?:HTMLElement\|null,start='100%',end=0}` → `{ref:RefCallback<T>,progress:number}`; диапазон 0…1, числа px, строки %/vh. Используй progress в style/className, callback option отсутствует. |
| `useSticky<T>()` | `{root?:Element\|Document\|null,rootMargin='-1px 0px 0px 0px'}` → `{ref,stuck:boolean}`. Нужен CSS sticky. |
| `useHover()` | `{hovered:boolean,bind:{onPointerEnter,onPointerLeave}}`; spread bind на элемент. Если нужны свои обработчики, явно скомпонуй вызовы, не затри bind. |
| `useMediaQuery(query:string,serverValue=false)` | boolean; начальный клиентский снимок совпадает с SSR, затем matchMedia. |
| `LazyImage(props)` | Стандартные ImgHTMLAttributes, loading='lazy'; callbacks обычного React img. data-src преобразований нет. |
| `ScrollLink(props)` | Стандартные AnchorHTMLAttributes + href:string, offset=0, behavior='smooth'. onClick(event) вызывается первым; preventDefault отменяет встроенную обработку. Перехватывает подходящие #id ссылки; учитывает модификаторы/target и reduced motion, переносит фокус. |

`loadPage(page:number,{signal:AbortSignal}):Promise<{items:T[],hasMore:boolean}>` возвращает объект, **не boolean как vanilla loadmore**. Хук сам накапливает items и увеличивает page после успеха; до него ошибка сохраняет текущую страницу. При truthy error автоповторы останавливаются (бросай Error, а не null/false); ручной loadMore() повторяет. enabled=false блокирует и ручную загрузку. resetKey/initialPage сбрасывают накопление и отменяют старый запрос; unmount также отменяет. Пока ref-маркер виден, загружает страницы последовательно. Никакого onLoad/onError callback у хука нет: используй результат и state/effect по необходимости.

## Уточнения жизненного цикла и взаимодействия

### Modal

После первого mount содержимое рендерится даже при open=false; это не lazy-mount при первом открытии. Закрытие сохраняет React state детей. Unmount немедленно освобождает scroll lock и возвращает фокус; условный рендер `{open && <Modal .../>}` обрывает выходной переход. При false dialog остаётся открытым на время максимума computed transitionDuration+transitionDelay окна/overlay/крестика, потом закрывается. Это не ожидание произвольной CSS animation-duration.

returnFocusRef фиксируется при начале сессии открытия, иначе берётся прежний activeElement; initialFocusRef используется только если его узел внутри dialog. При reopening во время closing старый таймер отменяется и текущая сессия продолжается; смена initialFocusRef не означает повторную фокусировку. Для backdrop должны и pointerdown, и click прийти вне окна: перетаскивание изнутри наружу не закрывает. closeOnEscape=false предотвращает стандартное cancel-закрытие; closeOnBackdrop=false не отключает крестик. Внешнее native dialog.close(), пока prop open ещё true, вызывает запрос onOpenChange(false); это не публичный imperative ref API. title — настоящий h2, description — p, учитывай допустимое HTML-содержимое.

### Dropdown и Sheets

Dropdown disabled отключает trigger, но не обнуляет controlled open и не делает весь уже открытый список disabled. Для полного запрета задавай open=false и нужные disabled у items. item.href создаёт ссылку только если item не disabled, иначе button. keepOpen предотвращает закрытие после выбора, но не навигацию по href. Если нужно preventDefault/MouseEvent, item.onSelect его не получает: не выдумывай event-параметр. Синхронное исключение callback прерывает последующие действия, это не поддерживаемый механизм отмены.

Меню позиционируется относительно родителя и корректируется по viewport при resize/scroll/ResizeObserver; портал/произвольный контейнер не поддерживается, clipping overflow-предком остаётся возможным. Меню остаётся смонтированным, при !open становится inert, exit-переход завершается до снятия ready. Sheets также всегда рендерит все панели (скрытые через hidden), поэтому эффекты в содержимом скрытых панелей продолжают работать. Если все items disabled/пусты — активной панели нет. Вложенные Sheets в content панели имеют отдельные state и useId; идентификаторы items должны быть уникальны внутри одной группы.

### Autocomplete

Локальный поиск тоже проходит debounce, сравнивает getLabel(item).toLocaleLowerCase().includes(value.toLocaleLowerCase()), не обрезает пробелы в самом запросе. Без getKey ключи — индексы; renderItem оборачивается в span внутри li, поэтому возвращай подходящее содержимое, а не собственный li. Не передавай новый items=[] на каждом рендере без необходимости: items участвует в dependencies и перезапускает загрузку даже при loadData.

loadData/getLabel читаются через latest-ref; одна лишь замена этих функций при неизменных value/eligible/debounce/items не запускает новый поиск. При смене внешнего фильтра согласуй query/items или перемонтируй компонент ключом, если нужен полный сброс. resetKey prop у Autocomplete нет.

inputProps типизирован шире фактической возможности переопределения: ref/id/value/role/autoComplete/ARIA combobox и обработчики, выставленные после spread, выигрывают; autoComplete всегда 'off', внешний input ref не предоставляется. label всегда отображается. Нет public ref/open/defaultValue/onBlur/onError props уровня Autocomplete. После выбора закрывается список, но реальный input может остаться в фокусе; повторно открывается вводом/стрелками, не обязательно новым focus. Enter без активного пункта не preventDefault, так что может отправить форму — в отличие от vanilla Enter. Escape открытого списка останавливает всплытие; blur закрывает, но не сбрасывает выбранный объект родителя.

### Slider

Для mouse выбор идёт по PointerMove и не требует pointerdown; над button/input/select/textarea он пропускается. При non-mouse primary pointer touch=true разрешает drag, порог переключения 10% ширины контейнера+gap, rubber на границах .15. touch=false отключает non-mouse drag, но не mouse hover и не клавиатуру. ArrowLeft/Right/Home/End работают только когда event.target — сам корень слайдера, не интерактивный ребёнок. Индикаторы декоративны, не кликабельные кнопки. После drag ближайший click подавляется, чтобы свайп не открывал ссылку.

В отличие от vanilla, каждый child получает дополнительную x-react-slider-item обёртку; не рассчитывай на vanilla DOM. Неактивные слайды inert/aria-hidden, но не размонтированы, их эффекты продолжаются. Давай стабильные keys, конечный целый индекс и неотрицательный конечный gap: React props не проходят vanilla _validateConfig. Не обещай одинаковые lazyload/touch-detection реализации.

### Hooks

- ref у useAppear/useSticky/useScrollProgress — callback ref. Возвращаемый snapshot связан с конкретным DOM-узлом; замена ref-узла даёт начальное состояние. Не читай ref.current. useHover не синхронизирует ссылки с одинаковым href как vanilla hover и игнорирует pointerenter с pointerType='touch'.
- useAppear threshold задаёт уведомления observer, но visible определяется entry.isIntersecting, а не проверкой intersectionRatio>=threshold. При отсутствии IntersectionObserver устанавливает visible/appeared=true; useSticky в такой среде оставляет stuck=false. once действует в текущем цикле наблюдения: изменение root/rootMargin/threshold/once пересоздаёт observer и может обновить visible; не обещай «навсегда true» после любых изменений options.
- useScrollProgress считает положение верха элемента относительно внутренней верхней границы root; при start=end это ступень 0/1. Строки поддерживаются через parseFloat и суффиксы %/vh, полноценный CSS calc/rem не вычисляется. Следит за scroll, window resize и размерами root/элемента при ResizeObserver; произвольный layout shift других узлов без этих событий может не обновить progress немедленно.
- useLoadMore enabled=false запрещает **новые** загрузки, но уже начатый запрос не abort-ится и может добавить items. Для сброса/отмены текущего поколения меняй resetKey/initialPage или размонтируй. Смена identity loadPage не сбрасывает страницы: следующий запрос возьмёт новую функцию через ref. При reset возвращаемый snapshot обновляется effect, не синхронно в момент render.
- loadMore() возвращает Promise<void>, не массив и не rethrow ошибки: результат читается из items/error после рендера. Автоподгрузка требует truthy hasMore и отсутствия truthy error; `{items:[],hasMore:true}` при постоянно видимом маркере может вызвать бесконечную последовательность запросов. При окончании данных явно верни hasMore:false. Дубликаты items по id не удаляются. Без IntersectionObserver fallback useAppear считает маркер видимым, так что enabled нужен и для ограничения такой автозагрузки.
- useMediaQuery сохраняет serverValue для начального render/смены query до effect; последующая смена serverValue при неизменном query не переопределяет реальный match. Требуется window.matchMedia с addEventListener.
- ScrollLink onClick должен вызвать preventDefault синхронно, до await; его Promise не ожидается. При download, модификаторах, неосновной кнопке, target кроме _self и href не начинающемся с # остаётся нативное поведение. URL вида /page#id не обрабатывается. Обновляет hash через pushState, прокручивает только window, добавляет временный tabindex=-1 цели без собственного tabindex, снимает его на blur. Return false из onClick недостаточен.
