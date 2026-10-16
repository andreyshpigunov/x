# x.lib, формы и выбор JavaScript API

Источник: `src/components/x/lib.js`, `form.js`, `typograf.js`. Это vanilla API; изменения DOM не применяй к узлам, которыми владеет React.

## Селекторы и классы

`lib.id(id)` → HTMLElement|null; `qs(selector, context=null)` → первый узел|null; `qsa(selector, context=null)` → массив узлов (не NodeList). qs/qsa принимают строку CSS, Node, NodeList, массив узлов/селекторов или window (qs → window, qsa → [window]); id принимает именно id. Для массива qs проверяет только первый элемент, qsa разворачивает все и не удаляет дубликаты. HTMLCollection не поддерживается напрямую — Array.from(collection). Некорректный CSS-селектор может бросить исключение; context по умолчанию document. Для динамического селектора используй CSS.escape, для прямого id достаточно id/getElementById.

`hide/show/toggle(selector): Promise<void>` добавляют/снимают `.hidden`; `switch(selector, condition)` показывает при true. Это не изменение hidden-атрибута.

`addClass/removeClass/toggleClass(selector, className, delay=0)` и `switchClass(selector, className, condition, delay=0)` → Promise<void>. При delay>0 add сначала добавляет `${className.replace(/_.*/, '')}_ready`, ждёт delay, затем основной класс; remove снимает основной, ждёт delay, снимает ready. Это протокол двух классов, не обычный setTimeout. Передавай один class token: строка с пробелами не является списком классов. toggleClass с задержкой обрабатывает элементы последовательно (общая длительность растёт с числом элементов), addClass/removeClass — одну группу за общую задержку. Отмены и защиты от конкурирующих вызовов нет. Для одного немедленного переключения подходит `element.classList.toggle(name, condition)`.

## Callback-функции и async

| Метод | Сигнатура, результат, очистка |
| --- | --- |
| `debounce(fn, wait, {leading=false,trailing=true}={})` | Возвращает функцию с `.cancel()`. Передаёт последние аргументы и this в fn; результат fn/Promise вызывающему не возвращает. Для поиска после паузы. |
| `throttle(fn, wait, {leading=true,trailing=true}={})` | Аналогичная функция с cancel; ограничивает частоту. Для scroll/resize, если не нужен requestAnimationFrame. Нет flush/maxWait. |
| `onAppear(selector, appearCallback, disappearCallback=null, options={})` | callbacks `(element) => void`, не IntersectionObserverEntry. Возвращает IntersectionObserver: для очистки вызови observer?.disconnect(). Без DOM, поддержки API, валидного callback или совпавших элементов возвращает undefined. Без disappearCallback после появления unobserve; с ним повторное наблюдение. disappearCallback вызывается при любой записи !isIntersecting, в том числе начальной до первого появления. Возвраты/Promise обоих callbacks игнорируются. Defaults root:null, rootMargin:'200px', threshold:.1. |
| `loadScript(path, callback, type='async')` | Для новой/ожидающей загрузки callback вызывается как `callback.call(script, loadEvent)`, то есть аргумент Event и this=HTMLScriptElement (у обычной функции). Для URL в loadedScripts callback вызывается синхронно как `callback()` без Event и без script-this. Не полагайся на единый this/аргумент в обеих ветках. Параллельные вызовы объединяются. Возвращает void, не Promise; error-callback нет. type — имя boolean-атрибута script, НЕ MIME type: `'module'` здесь не устанавливает type='module'. Для ES-модуля используй import(). |
| `deferred(callback, delay=10000)` | Однократный запуск после взаимодействия/таймаута, с ожиданием window.load, если документ ещё не complete. Аргументы callback не являются стабильным API: прямой вызов без аргументов либо callback как обработчик load. Возвращает cancel(): void, снимающую таймер, interaction-listeners и pending load-listener; уже начавшийся callback не прерывается. `deffered` — alias с исторической опечаткой. |
| `runAfterInteraction(callback, delay=5000)` | callback `(reason: string) => void`, reason — тип первого события либо 'timeout'. Не ждёт window.load. Возвращает функцию отмены; в SSR no-op cancel. |
| `render(selector, data, placement=null, escapeHtml=false)` | Promise<void>. data — значение либо `() => value/Promise<value>`; функцию вызывает один раз без аргументов для всех найденных узлов; если узлов нет, не вызывает её вообще. Готовый Promise как data не await-ится: передай функцию. null placement заменяет содержимое; beforebegin/afterbegin/beforeend/afterend вставляют. Ошибки data-функции/вставки перехватываются внутри, но поиск selector выполняется до try и некорректный селектор отклонит Promise. |
| `sleep(ms)` | Promise<void>, ожидание, без отмены. |

HTML-render использует innerHTML/insertAdjacentHTML. Для текста передай escapeHtml=true или используй textContent. Не вставляй HTML ответа API без принятой в приложении обработки. `[x-render]` исполняет выражение через eval на DOMContentLoaded: это доверенный код шаблона, не механизм обработки пользовательского ввода. Обработчик регистрируется при создании singleton lib, а не x.init(); при импорте после DOMContentLoaded автоматического прохода не будет. После изменения x-render повторного исполнения нет. Не используй над React-деревом.

```js
const onSearch = x.lib.debounce(event => search(event.target.value), 300);
field.addEventListener('input', onSearch);
const observer = x.lib.onAppear('.card', el => el.classList.add('seen'));
const cancel = x.lib.runAfterInteraction(reason => startOptionalWidget(reason));
// При удалении страницы:
field.removeEventListener('input', onSearch);
onSearch.cancel();
observer?.disconnect();
cancel();
```

Debounce не защищает ответы fetch от гонки. Для собственных запросов используй AbortController или проверку актуальности; vanilla autocomplete.loadData и loadmore callback получают {signal} вторым аргументом; остальные callbacks не получают его автоматически.

## Форматирование, проверки и навигация

- `price(number|string): string`: два десятичных знака, убирает .00; тонкие пробелы для тысяч начиная с |число|≥10000. `number(value): string` — группирует целую часть тонкими пробелами, сохраняет дробную. Для локализованной валюты/дат вне контракта X используй Intl.
- `numberDecline(n, nominative, genitiveSingular, genitivePlural): string`: русские формы для неотрицательных целых количеств. Отрицательные и дробные числа функция не нормализует.
- `phoneCleaner(value=''): string`, `phone(value=''): string`: российская нормализация/форматирование, не международный телефонный валидатор. Префикс 8 заменяется на 7, кроме 8800; ограничение 11 цифр.
- `isEmail(value)`, `isValidJSON(str)`, `isInteger(value)`, `isDouble(value)` → boolean. isInteger делает Number(value) затем Number.isInteger; isDouble делает Number(value) и проверку !isNaN, поэтому допускает Infinity и целые. Пустая строка конвертируется в 0. Для строгой проверки используй нужный Number API.
- `random(a,b)` → целое включительно; `makeId()` → строка id + шестизначное число, без проверки уникальности; `makePassword(length=8, selector?)` → строка без selector; с selector заполняет первое поле и возвращает undefined. Используется Math.random, для токенов/секретов нужен crypto.
- `reload()`, `reloadWithHash(hash)`, `redirectTo(url)`, `updateURL(url,title)` → void; updateURL использует history.pushState с fallback location.href. Для React/Next-навигации используй router проекта.
- `alertErrors(data)` принимает строку или объект, объединяет Object.values через перенос строки; `printErrors(data)` → экранированная HTML-строка: div для строки или div.error_KEY для каждой пары объекта.
- `transitionsOn(delay=0)`, `transitionsOff()` переключают оба совместимых класса html: канонический `no-transitions` и прежний `noTransitions`. CSS поддерживает оба. Off отменяет ранее назначенное включение; On заменяет предыдущий таймер и снимает оба класса через delay (даже 0 асинхронно). Классы отключают transitions у потомков html, не CSS animations.

## Form

Инициализация не нужна. `form.listen.update` — Set подписанных элементов (совместимый диагностический доступ); Object.freeze внешнего listen не делает Set неизменяемым. Не меняй Set вручную — подписками владеют onUpdate/offUpdate/destroy. `getEventType(element): 'input'|'change'` — input для input/textarea/contenteditable, change для select; неподдерживаемый элемент вызывает Error.

- `setChecked(selector, checked=false): void` принимает boolean и меняет checkbox/radio, отправляет всплывающий input только при изменении.
- `setValue(selector, value): void` записывает String(value) в обычные поля, boolean в checked checkbox/radio, innerText в contenteditable; отправляет соответствующий input/change. Отправляет событие даже если значение не изменилось; readonly/disabled не блокируют программную запись; неподдерживаемые элементы пропускает, ошибки записи логирует. Не предполагает React controlled state.
- `onUpdate(selector, callback): void`: callback получает **element**, не Event и не value. Возврат игнорируется. Подписывает существующие узлы, не делегирует будущие; повторная регистрация на уже подписанном узле пропускается. Для замены сначала вызови offUpdate.
- `offUpdate(selector): void` снимает свои подписки; `update(selector): void` генерирует input/change; `destroy(): void` снимает все подписки X form.

```js
x.form.onUpdate('#amount', el => {
  total.textContent = x.lib.price(Number(el.value) * unitPrice);
});
x.form.setValue('#amount', 2); // запускает обновление через событие
```

В callback не вызывай setValue/update того же поля без условия: можно получить рекурсивные события. Для отправки формы используй обычный submit/FormData/fetch; X form не предоставляет submit-загрузчик или onSuccess/onError.

## Typograf

`typograf.process(html: string): string` обрабатывает текст с сохранением пропускаемых тегов; не санитайзер. `live(staticSelector='.typograf', interactiveSelector='.typograf-live', root=globalThis.document): () => void` обрабатывает статичные узлы и добавляет root input-listener для редактируемых. Статичный не-contenteditable элемент переписывается через textContent: вложенная разметка и её обработчики исчезают. Для HTML-структуры используй process отдельно, понимая способ вставки. В live обрабатываются только input[type=text], textarea и contenteditable; cursor offsets восстанавливаются приблизительно, не обещай точность для сложной разметки. process сохраняет теги и пропускает текст code/pre/script/style, но это regex-обработка, не HTML-парсер; принимает строку, null/число не приводит автоматически. Преобразует многоточие, знаки copyright/товарных марок/рубля, известные дроби, односимвольную степень после ^, минус между цифрами, тире, пробелы около коротких слов/частиц и кавычки. Настроек отдельных правил нет. live в SSR возвращает no-op cleanup. Callback options нет. Повторный live на том же root снимает предыдущую подписку; возвращает cleanup для этой регистрации. typograf.destroy(root?) снимает подписку конкретного root либо всех root. Старый cleanup не удаляет более новую регистрацию; обработанный текст не откатывается. В React обрабатывай значение явно через согласованную с проектом логику, не запускай live поверх DOM. Не заменяй типографику next-cms без задачи.

## Выбор средства

| Задача | Предпочтительный путь |
| --- | --- |
| Существующая vanilla-модалка X | modal + события жизненного цикла после преобразования DOM |
| React UI | Компоненты/hooks `/react`, state и callbacks, без DOM-render X |
| Простая смена текста/атрибута | textContent/setAttribute/classList; X helper полезен для нескольких узлов или ready-протокола |
| Изменение vanilla-поля с уведомлением слушателей | form.setValue/setChecked |
| Прокрутка с прогрессом/классами X | animate; React — useScrollProgress |
| Однократная видимость с callback | lib.onAppear; штатные классы X — appear; сложные записи observer — нативный IntersectionObserver |
| Отложенный поиск | debounce + отмена/проверка актуальности запроса; готовый поиск X — autocomplete |
| Обычное изображение | loading='lazy'; data-src преобразования нужны лишь для принятого vanilla lazyload/slider |

## Контекст вызова и ошибки callbacks

Для собственных callback-функций не рассчитывай на неоговорённый this. В debounce/throttle сохраняется this вызова обёртки; в остальных случаях предпочитай замыкание или явный аргумент. `lib` содержит методы, использующие this: например `const {phone} = lib; phone(...)` теряет контекст; используй `lib.phone(...)` либо bind. Это относится и к `scroll.to`, который является alias, но не bound-функцией.

`lib.loadedScripts` — Set строк путей, не DOM-реестр: `./a.js` и абсолютный URL не нормализуются в один ключ; сторонний script-тег автоматически в Set не попадает. Ошибка загрузки удаляет pending-запись и созданный тег, поэтому следующий вызов может повторить загрузку. Callback обязателен, иначе script не создаётся. Новая загрузка ловит синхронную ошибку каждого callback и продолжает следующие, cache-hit вызывает callback без такого try; rejected Promise callback не ожидается. Для Promise-контракта с обработкой сетевой ошибки используй собственный загрузчик/import(), не оборачивай loadScript в Promise, который при error никогда не завершится.

`debounce`/`throttle` возвращают undefined при вызове обёртки, даже если fn возвращает значение. cancel отменяет таймер, но не уже начавшуюся async-работу. У debounce leading+trailing одиночный вызов срабатывает только leading, повторные дают trailing с последними аргументами. У throttle leading:false,trailing:false не является надёжным «отключением»: после истечения интервала новый вызов может выполнить fn. Для отключения используй явное условие. Оба callback выполняются без catch.

`deferred` ждёт первое scroll/resize/click/keydown/mousemove/touchmove либо timeout, потом при необходимости load. `runAfterInteraction` слушает pointerdown/pointermove/touchstart/touchmove/scroll/mousemove/click/keydown (capture/passive), передаёт reason и не ждёт загрузку страницы. Его delay приводится к числу, отрицательный ограничивается 0, нечисловой заменяется 5000. Возвращённая cancel прекращает только ещё не выполненный запуск.


`setValue` для checkbox/radio приводит значение через `!!value`: строка 'false' включает checked, а не выключает. Для checkbox используй boolean. `offUpdate('#removed')` не найдёт уже удалённый из документа узел: передавай сохранённый элемент или вызывай destroy при завершении страницы. setChecked/setValue/update генерируют синтетические bubbling events, не настоящее пользовательское действие; return false callback не отменяет уже сделанную запись.
