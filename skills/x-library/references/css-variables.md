# Индекс CSS-переменных X

Срез исходников 0.6.0-beta.1, проверен CSS-парсером PostCSS. Комментарии исключены; объявления без завершающей точки с запятой учтены. Содержание: файлы vanilla в алфавитном порядке (общие defaults — variables.css), затем React CSS.

«Объявление» — значение и область, где переменная задаётся. «Fallback» — запасное значение конкретного var(), не глобальный default. «Без fallback» требует объявления на элементе/предке. L — строка исходного файла; длинная область сокращена, цепочка → показывает вложенность. Ссылки вида --space-$(i) — шаблон PostCSS с индексом цикла, не буквальное имя CSS-переменной. Подробности каскада и выбора — [css.md](css.md).

## src/components/x/buttons.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--button-active-darken` | — | Без fallback |
| `--button-border-radius` | `.5em` — `.button_label (L129)` | Без fallback |
| `--button-box-shadow` | `none` — `.button_clear (L165)` | Без fallback |
| `--button-box-shadow-active` | `none` — `.button_clear (L167)` | Без fallback |
| `--button-box-shadow-hover` | `none` — `.button_clear (L166)` | Без fallback |
| `--button-color` | `var(--color-primary)` — `.button_primary (L139)`<br>`var(--color-success)` — `.button_success (L143)`<br>`var(--color-warning)` — `.button_warning (L147)`<br>`var(--color-danger)` — `.button_danger (L151)`<br>`#fff` — `.button_white (L155)`<br>`#111` — `.button_black (L159)`<br>`transparent` — `.button_clear (L163)` | Без fallback |
| `--button-color-active` | `color-mix( in oklab, var(--button-color) calc(100% - var(--button-active-darken)), black var(--button-active-darken) )` — `.button, [type=submit] (L31)`<br>`transparent` — `.button_clear (L164)` | Без fallback |
| `--button-color-hover` | `color-mix( in oklab, var(--button-color) calc(100% - var(--button-hover-lighten)), white var(--button-hover-lighten) )` — `.button, [type=submit] (L26)` | Без fallback |
| `--button-disabled-opacity` | — | Без fallback |
| `--button-font-color` | `#fff` — `.button_primary (L140)`<br>`#fff` — `.button_success (L144)`<br>`#fff` — `.button_warning (L148)`<br>`#fff` — `.button_danger (L152)`<br>`#000` — `.button_white (L156)`<br>`#fff` — `.button_black (L160)` | Без fallback |
| `--button-font-color-active` | `var(--button-font-color)` — `.button, [type=submit] (L37)` | Без fallback |
| `--button-font-color-hover` | `var(--button-font-color)` — `.button, [type=submit] (L36)` | Без fallback |
| `--button-font-family` | — | Без fallback |
| `--button-font-size` | `inherit` — `.button_label (L128)` | Без fallback |
| `--button-font-weight` | — | Без fallback |
| `--button-height` | `calc(var(--line-height) * 1em)` — `.button_label (L126)`<br>`0` — `.button_link, .button_inline (L134)` | Fallback `calc(var(--button-font-size) * var(--button-height-coeff))` |
| `--button-height-coeff` | — | Без fallback |
| `--button-hover-lighten` | — | Без fallback |
| `--button-side-padding` | `.5em` — `.button_label (L127)`<br>`0` — `.button_link, .button_inline (L135)` | Fallback `calc(var(--button-font-size) * var(--button-side-padding-coeff))`<br>Fallback `var(--temp)`<br>Fallback `calc(var(--button-font-size) * var(--button-side-padding-coeff) )` |
| `--button-side-padding-coeff` | — | Без fallback |
| `--button-transform` | — | Без fallback |
| `--button-transform-active` | — | Без fallback |
| `--button-transform-hover` | — | Без fallback |
| `--button-transform-origin` | — | Без fallback |
| `--button-transition` | — | Без fallback |
| `--color-danger` | — | Без fallback |
| `--color-primary` | — | Без fallback |
| `--color-success` | — | Без fallback |
| `--color-warning` | — | Без fallback |
| `--line-height` | — | Без fallback |
| `--space-1` | — | Без fallback |
| `--temp` | `calc(var(--button-font-size) * var(--button-side-padding-coeff))` — `.button_dropdown (L196)` | Без fallback |

## src/components/x/colors.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--color-black` | — | Без fallback |
| `--color-danger` | — | Без fallback |
| `--color-error` | — | Без fallback |
| `--color-grey` | — | Без fallback |
| `--color-primary` | — | Без fallback |
| `--color-success` | — | Без fallback |
| `--color-warning` | — | Без fallback |
| `--color-white` | — | Без fallback |

## src/components/x/debug.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--font-family-mono` | — | Fallback `monospace` |

## src/components/x/dropdown.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--dropdown-backgroud-color` | — | Без fallback |
| `--dropdown-border-radius` | — | Без fallback |
| `--dropdown-box-shadow` | — | Без fallback |
| `--dropdown-divider-color` | — | Без fallback |
| `--dropdown-item-background-color` | — | Без fallback |
| `--dropdown-item-background-color-hover` | — | Без fallback |
| `--dropdown-item-font-color` | — | Без fallback |
| `--dropdown-item-font-color-hover` | — | Без fallback |
| `--dropdown-item-font-size` | — | Без fallback |
| `--dropdown-item-padding` | — | Без fallback |
| `--dropdown-max-width` | — | Без fallback |
| `--dropdown-padding` | — | Без fallback |
| `--scroll-scrollbar-size` | — | Без fallback |
| `--scroll-scrollbar-thumb-background` | — | Без fallback |
| `--scroll-scrollbar-thumb-background-hover` | — | Без fallback |

## src/components/x/flow.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--space-$(i)` | — | Без fallback |

## src/components/x/form.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--font-size` | — | Без fallback |
| `--form-background-color` | — | Без fallback |
| `--form-background-color-disabled` | — | Без fallback |
| `--form-background-color-readonly` | — | Без fallback |
| `--form-border-color` | — | Без fallback |
| `--form-border-color-disabled` | — | Без fallback |
| `--form-border-color-error` | — | Без fallback |
| `--form-border-color-focused` | — | Без fallback |
| `--form-border-color-readonly` | — | Без fallback |
| `--form-border-radius` | — | Без fallback |
| `--form-border-width` | — | Без fallback |
| `--form-font-color` | — | Без fallback |
| `--form-font-color-disabled` | — | Без fallback |
| `--form-font-color-placeholder` | — | Без fallback |
| `--form-font-color-readonly` | — | Без fallback |
| `--form-font-size` | — | Без fallback |
| `--form-height` | — | Без fallback<br>Fallback `calc(var(--form-font-size) * var(--form-height-coeff))` |
| `--form-height-coeff` | — | Без fallback |
| `--form-side-padding` | — | Без fallback |
| `--form-width` | — | Без fallback |

## src/components/x/lib.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--container-max-width` | — | Без fallback |
| `--font-family-mono` | — | Fallback `monospace` |
| `--shadow-1` | — | Без fallback |
| `--shadow-2` | — | Без fallback |
| `--shadow-3` | — | Без fallback |
| `--shadow-4` | — | Без fallback |
| `--shadow-5` | — | Без fallback |
| `--space-$(i)` | — | Без fallback |

## src/components/x/links.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--link-color` | — | Без fallback |
| `--link-color-hover` | — | Fallback `var(--link-color)` |
| `--link-color-visited` | — | Fallback `var(--link-color)` |
| `--link-decoration-color` | — | Fallback `color-mix(in srgb, currentcolor, transparent 85%)` |
| `--link-decoration-color-hover` | — | Fallback `currentcolor` |
| `--link-decoration-color-visited` | — | Fallback `currentcolor` |
| `--link-decoration-line` | `none` — `a → &.link_noline (L66)`<br>`underline` — `a → &.link_underline (L69)` | Без fallback |
| `--link-decoration-line-hover` | — | Fallback `var(--link-decoration-line)` |
| `--link-decoration-style` | `dashed` — `a → &.link_dashed (L72)`<br>`dotted` — `a → &.link_dotted (L75)`<br>`wavy` — `a → &.link_wavy (L78)` | Без fallback |
| `--link-decoration-style-hover` | — | Fallback `var(--link-decoration-style)` |
| `--link-decoration-thickness` | — | Fallback `.06em` |
| `--link-transition` | — | Fallback `all .1s ease-out` |
| `--link-underline-offset` | — | Fallback `.25em` |

## src/components/x/modal.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--modal-background` | — | Без fallback |
| `--modal-border-radius` | — | Без fallback |
| `--modal-box-shadow` | — | Без fallback |
| `--modal-closer-area` | — | Без fallback |
| `--modal-closer-color` | — | Без fallback |
| `--modal-closer-color-hover` | — | Без fallback |
| `--modal-closer-margin-right` | — | Без fallback |
| `--modal-closer-margin-top` | — | Без fallback |
| `--modal-closer-size` | — | Без fallback |
| `--modal-closer-width` | — | Без fallback |
| `--modal-margin-bottom` | — | Без fallback |
| `--modal-margin-left` | — | Без fallback |
| `--modal-margin-right` | — | Без fallback |
| `--modal-margin-top` | — | Без fallback |
| `--modal-overlay-background-color` | — | Без fallback |
| `--modal-padding-bottom` | — | Без fallback |
| `--modal-padding-left` | — | Без fallback |
| `--modal-padding-right` | — | Без fallback |
| `--modal-padding-top` | — | Без fallback |

## src/components/x/reset.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--background-color` | — | Без fallback |
| `--font-color` | — | Без fallback |
| `--font-family` | — | Без fallback |
| `--font-family-mono` | — | Без fallback |
| `--font-scale` | `0.75` — `html → &.scale5n (L68)`<br>`0.80` — `html → &.scale4n (L69)`<br>`0.85` — `html → &.scale3n (L70)`<br>`0.90` — `html → &.scale2n (L71)`<br>`0.95` — `html → &.scale1n (L72)`<br>`1.00` — `html → &.scale0 (L73)`<br>`1.05` — `html → &.scale1 (L74)`<br>`1.10` — `html → &.scale2 (L75)`<br>`1.15` — `html → &.scale3 (L76)`<br>`1.20` — `html → &.scale4 (L77)`<br>`1.25` — `html → &.scale5 (L78)` | Без fallback |
| `--font-size` | — | Без fallback |
| `--font-size-base` | — | Без fallback |
| `--line-height` | — | Без fallback |

## src/components/x/scroll.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--scroll-scrollbar-size` | — | Без fallback |
| `--scroll-scrollbar-thumb-background` | — | Без fallback |
| `--scroll-scrollbar-thumb-background-hover` | — | Без fallback |

## src/components/x/slider.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--slider-indicators-bottom` | — | Без fallback |
| `--slider-indicators-gap` | — | Без fallback |
| `--slider-indicators-height` | — | Без fallback |
| `--slider-indicators-init-opacity` | — | Без fallback |
| `--slider-indicators-left` | — | Без fallback |
| `--slider-indicators-right` | — | Без fallback |
| `--slider-indicators-top` | — | Без fallback |
| `--slider-indicators-width` | — | Без fallback |
| `--slider-object-fit` | — | Без fallback |
| `--slider-point-color` | — | Без fallback |
| `--slider-point-color-active` | — | Без fallback |
| `--slider-point-size` | — | Без fallback |

## src/components/x/space.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--space-$(i)` | — | Без fallback |

## src/components/x/typo.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--blockquote-border` | — | Без fallback |
| `--blockquote-font-style` | — | Без fallback |
| `--blockquote-margin` | — | Без fallback |
| `--blockquote-padding` | — | Без fallback |
| `--figcaption-color` | — | Без fallback |
| `--figcaption-font-size` | — | Без fallback |
| `--figcaption-margin-top` | — | Без fallback |
| `--figure-margin` | — | Без fallback |
| `--font-family-mono` | — | Fallback `monospace` |
| `--h1-font-size` | — | Без fallback |
| `--h1-line-height` | — | Без fallback |
| `--h2-font-size` | — | Без fallback |
| `--h2-line-height` | — | Без fallback |
| `--h3-font-size` | — | Без fallback |
| `--h3-line-height` | — | Без fallback |
| `--h4-font-size` | — | Без fallback |
| `--h5-font-size` | — | Без fallback |
| `--h6-font-size` | — | Без fallback |
| `--headers-font-color` | — | Без fallback |
| `--headers-font-family` | — | Без fallback |
| `--headers-font-weight` | — | Без fallback |
| `--headers-margin-bottom` | — | Без fallback |
| `--headers-margin-top` | — | Без fallback |
| `--paragraph-margin` | — | Без fallback |
| `--space-1` | — | Без fallback |
| `--space-3` | — | Без fallback |
| `--table-border` | — | Без fallback |
| `--table-caption-font-weight` | — | Без fallback |
| `--table-header-font-weight` | — | Без fallback |
| `--table-padding` | — | Без fallback |

## src/components/x/variables.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--background-color` | `#fff` — `:root (L20)` | — |
| `--blockquote-border` | `none` — `:root (L61)` | — |
| `--blockquote-font-style` | `italic` — `:root (L62)` | — |
| `--blockquote-margin` | `2em 0` — `:root (L59)` | — |
| `--blockquote-padding` | `1em 2em` — `:root (L60)` | — |
| `--button-active-darken` | `5%` — `:root (L125)` | — |
| `--button-border-radius` | `calc(var(--button-font-size) * 0.6)` — `:root (L121)` | — |
| `--button-box-shadow` | `0 .1rem .1rem #00000011` — `:root (L117)` | — |
| `--button-box-shadow-active` | `inset 0 0 .1rem #00000011` — `:root (L119)` | — |
| `--button-box-shadow-hover` | `0 .1rem .1rem #00000022` — `:root (L118)` | — |
| `--button-color` | `var(--color-grey)` — `:root (L107)` | — |
| `--button-disabled-opacity` | `.5` — `:root (L120)` | — |
| `--button-font-color` | `#000` — `:root (L109)` | — |
| `--button-font-family` | `var(--font-family)` — `:root (L108)` | — |
| `--button-font-size` | `var(--font-size)` — `:root (L112)` | Без fallback |
| `--button-font-weight` | `400` — `:root (L110)` | — |
| `--button-height-coeff` | `2.6` — `:root (L105)` | — |
| `--button-hover-lighten` | `10%` — `:root (L124)` | — |
| `--button-side-padding-coeff` | `1.25` — `:root (L106)` | — |
| `--button-transform` | `translate(0,0)` — `:root (L113)` | — |
| `--button-transform-active` | `translate(0,.1rem)` — `:root (L115)` | — |
| `--button-transform-hover` | `none` — `:root (L114)` | — |
| `--button-transform-origin` | `center bottom` — `:root (L116)` | — |
| `--button-transition` | `all .1s ease-out` — `:root (L111)` | — |
| `--color-black` | `#000` — `:root (L100)` | — |
| `--color-danger` | `#ee3333` — `:root (L98)` | — |
| `--color-error` | `#ee3333` — `:root (L99)` | — |
| `--color-grey` | `#f4f5f6` — `:root (L102)` | Без fallback |
| `--color-primary` | `#0088ee` — `:root (L95)` | — |
| `--color-success` | `#33c433` — `:root (L96)` | — |
| `--color-warning` | `#ff8800` — `:root (L97)` | — |
| `--color-white` | `#fff` — `:root (L101)` | — |
| `--container-max-width` | `160rem` — `:root (L69)` | — |
| `--dropdown-backgroud-color` | `white` — `:root (L137)` | — |
| `--dropdown-border-radius` | `1.2rem` — `:root (L136)` | — |
| `--dropdown-box-shadow` | `var(--shadow-4)` — `:root (L138)` | — |
| `--dropdown-divider-color` | `var(--color-grey)` — `:root (L147)` | — |
| `--dropdown-item-background-color` | `white` — `:root (L145)` | — |
| `--dropdown-item-background-color-hover` | `var(--color-grey)` — `:root (L146)` | — |
| `--dropdown-item-font-color` | `black` — `:root (L143)` | — |
| `--dropdown-item-font-color-hover` | `black` — `:root (L144)` | — |
| `--dropdown-item-font-size` | `inherit` — `:root (L142)` | — |
| `--dropdown-item-padding` | `.6rem 2.4rem .6rem 1.2rem` — `:root (L141)` | — |
| `--dropdown-max-width` | `28rem` — `:root (L140)` | — |
| `--dropdown-padding` | `.8rem` — `:root (L139)` | — |
| `--figcaption-color` | `#999` — `:root (L57)` | — |
| `--figcaption-font-size` | `var(--font-size)` — `:root (L56)` | — |
| `--figcaption-margin-top` | `.5em` — `:root (L55)` | — |
| `--figure-margin` | `2.5em auto 2em` — `:root (L54)` | — |
| `--font-color` | `#000` — `:root (L19)` | Без fallback |
| `--font-family` | `system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"` — `:root (L12)` | Без fallback |
| `--font-family-mono` | `SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace` — `:root (L14)` | — |
| `--font-scale` | `1` — `:root (L18)` | — |
| `--font-size` | `1.6rem` — `:root (L17)` | Без fallback |
| `--font-size-base` | `62.5%` — `:root (L16)` | — |
| `--form-background-color` | `#fff` — `:root (L167)` | — |
| `--form-background-color-disabled` | `#f6f6f6` — `:root (L169)` | — |
| `--form-background-color-readonly` | `#fafafa` — `:root (L168)` | — |
| `--form-border-color` | `#d4d4d4` — `:root (L161)` | — |
| `--form-border-color-disabled` | `#ddd` — `:root (L165)` | — |
| `--form-border-color-error` | `#f00` — `:root (L163)` | — |
| `--form-border-color-focused` | `#8cf` — `:root (L162)` | — |
| `--form-border-color-readonly` | `#ddd` — `:root (L164)` | — |
| `--form-border-radius` | `.8rem` — `:root (L160)` | — |
| `--form-border-width` | `.1rem` — `:root (L159)` | — |
| `--form-font-color` | `#000` — `:root (L154)` | — |
| `--form-font-color-disabled` | `#666` — `:root (L156)` | — |
| `--form-font-color-placeholder` | `#ccc` — `:root (L157)` | — |
| `--form-font-color-readonly` | `#000` — `:root (L155)` | — |
| `--form-font-size` | `var(--font-size)` — `:root (L153)` | — |
| `--form-height-coeff` | `2.6` — `:root (L150)` | — |
| `--form-side-padding` | `1rem` — `:root (L151)` | — |
| `--form-width` | `40rem` — `:root (L149)` | — |
| `--h1-font-size` | `3.6rem` — `:root (L41)` | — |
| `--h1-line-height` | `1.2` — `:root (L48)` | — |
| `--h2-font-size` | `2.8rem` — `:root (L42)` | — |
| `--h2-line-height` | `1.25` — `:root (L49)` | — |
| `--h3-font-size` | `2.2rem` — `:root (L43)` | — |
| `--h3-line-height` | `1.3` — `:root (L50)` | — |
| `--h4-font-size` | `1.8rem` — `:root (L44)` | — |
| `--h5-font-size` | `1.6rem` — `:root (L45)` | — |
| `--h6-font-size` | `1.4rem` — `:root (L46)` | — |
| `--headers-font-color` | `var(--font-color)` — `:root (L39)` | — |
| `--headers-font-family` | `var(--font-family)` — `:root (L37)` | — |
| `--headers-font-weight` | `700` — `:root (L38)` | — |
| `--headers-margin-bottom` | `.5em` — `:root (L36)` | — |
| `--headers-margin-top` | `1em` — `:root (L35)` | — |
| `--line-height` | `1.5` — `:root (L15)` | — |
| `--link-color` | `#0060cc` — `:root (L77)` | — |
| `--link-decoration-line` | `underline` — `:root (L78)` | — |
| `--link-decoration-style` | `solid` — `:root (L79)` | — |
| `--modal-background` | `#fff` — `:root (L184)` | — |
| `--modal-border-radius` | `1.6rem` — `:root (L186)` | — |
| `--modal-box-shadow` | `0 1rem 4rem #00000033` — `:root (L185)` | — |
| `--modal-closer-area` | `4rem` — `:root (L189)` | — |
| `--modal-closer-color` | `#ccc` — `:root (L192)` | — |
| `--modal-closer-color-hover` | `#f00` — `:root (L193)` | — |
| `--modal-closer-margin-right` | `.6rem` — `:root (L188)` | — |
| `--modal-closer-margin-top` | `.6rem` — `:root (L187)` | — |
| `--modal-closer-size` | `2.4rem` — `:root (L190)` | — |
| `--modal-closer-width` | `.2rem` — `:root (L191)` | — |
| `--modal-margin-bottom` | `3vw` — `:root (L177)` | — |
| `--modal-margin-left` | `3vw` — `:root (L178)` | — |
| `--modal-margin-right` | `3vw` — `:root (L179)` | — |
| `--modal-margin-top` | `3vw` — `:root (L176)` | — |
| `--modal-overlay-background-color` | `#00000066` — `:root (L194)` | — |
| `--modal-padding-bottom` | `clamp(2.5rem, 4vw, 5rem)` — `:root (L181)` | — |
| `--modal-padding-left` | `clamp(2.5rem, 4vw, 5rem)` — `:root (L182)` | — |
| `--modal-padding-right` | `clamp(2.5rem, 4vw, 5rem)` — `:root (L183)` | — |
| `--modal-padding-top` | `clamp(2.5rem, 4vw, 5rem)` — `:root (L180)` | — |
| `--paragraph-margin` | `1em` — `:root (L52)` | — |
| `--scroll-scrollbar-size` | `6px` — `:root (L196)` | — |
| `--scroll-scrollbar-thumb-background` | `#00000011` — `:root (L197)` | — |
| `--scroll-scrollbar-thumb-background-hover` | `#00000022` — `:root (L198)` | — |
| `--shadow-1` | `0 1px 2px #00000012, 0 1px 1px #0000000a` — `:root (L71)` | — |
| `--shadow-2` | `0 2px 6px #00000014, 0 1px 2px #0000000c` — `:root (L72)` | — |
| `--shadow-3` | `0 6px 16px #00000016, 0 2px 4px #0000000c` — `:root (L73)` | — |
| `--shadow-4` | `0 12px 32px #00000018, 0 4px 8px #0000000e` — `:root (L74)` | Без fallback |
| `--shadow-5` | `0 20px 48px #0000001a, 0 8px 16px #00000010` — `:root (L75)` | — |
| `--slider-indicators-bottom` | `1rem` — `:root (L207)` | — |
| `--slider-indicators-gap` | `.3rem` — `:root (L203)` | — |
| `--slider-indicators-height` | `var(--slider-point-size)` — `:root (L209)` | — |
| `--slider-indicators-init-opacity` | `0` — `:root (L210)` | — |
| `--slider-indicators-left` | `1.2rem` — `:root (L205)` | — |
| `--slider-indicators-right` | `1.2rem` — `:root (L206)` | — |
| `--slider-indicators-top` | `auto` — `:root (L204)` | — |
| `--slider-indicators-width` | `auto` — `:root (L208)` | — |
| `--slider-object-fit` | `cover` — `:root (L211)` | — |
| `--slider-point-color` | `#ffffff66` — `:root (L200)` | — |
| `--slider-point-color-active` | `#fff` — `:root (L201)` | — |
| `--slider-point-size` | `.3rem` — `:root (L202)` | Без fallback |
| `--space-0` | `0` — `:root (L23)` | — |
| `--space-1` | `0.4rem` — `:root (L24)` | — |
| `--space-10` | `12.8rem` — `:root (L33)` | — |
| `--space-2` | `0.8rem` — `:root (L25)` | — |
| `--space-3` | `1.2rem` — `:root (L26)` | — |
| `--space-4` | `1.6rem` — `:root (L27)` | — |
| `--space-5` | `2.4rem` — `:root (L28)` | — |
| `--space-6` | `3.2rem` — `:root (L29)` | — |
| `--space-7` | `4.8rem` — `:root (L30)` | — |
| `--space-8` | `6.4rem` — `:root (L31)` | — |
| `--space-9` | `9.6rem` — `:root (L32)` | — |
| `--table-border` | `1px solid #e4e4e4` — `:root (L65)` | — |
| `--table-caption-font-weight` | `700` — `:root (L66)` | — |
| `--table-header-font-weight` | `700` — `:root (L67)` | — |
| `--table-padding` | `.5em .75em` — `:root (L64)` | — |

## src/react/dropdown.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--color-grey` | — | Fallback `#f4f5f6` |
| `--dropdown-backgroud-color` | — | Fallback `white` |
| `--dropdown-border-radius` | — | Fallback `1.2rem` |
| `--dropdown-box-shadow` | — | Fallback `var(--shadow-4, 0 12px 32px #00000018, 0 4px 8px #0000000e)` |
| `--dropdown-divider-color` | — | Fallback `var(--color-grey, #f4f5f6)` |
| `--dropdown-duration` | — | Fallback `.15s` |
| `--dropdown-item-background-color` | — | Fallback `white` |
| `--dropdown-item-background-color-hover` | — | Fallback `var(--color-grey, #f4f5f6)` |
| `--dropdown-item-font-color` | — | Fallback `black` |
| `--dropdown-item-font-color-hover` | — | Fallback `black` |
| `--dropdown-item-font-size` | — | Fallback `inherit` |
| `--dropdown-item-padding` | — | Fallback `.6rem 2.4rem .6rem 1.2rem` |
| `--dropdown-max-width` | — | Fallback `28rem` |
| `--dropdown-padding` | — | Fallback `.8rem` |
| `--scroll-scrollbar-size` | — | Fallback `6px` |
| `--scroll-scrollbar-thumb-background` | — | Fallback `#00000011` |
| `--scroll-scrollbar-thumb-background-hover` | — | Fallback `#00000022` |
| `--shadow-4` | — | Fallback `0 12px 32px #00000018, 0 4px 8px #0000000e` |

## src/react/modal.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--modal-background` | — | Fallback `#fff` |
| `--modal-border-radius` | — | Fallback `1.6rem` |
| `--modal-box-shadow` | — | Fallback `0 1rem 4rem #00000033` |
| `--modal-closer-area` | — | Fallback `4rem` |
| `--modal-closer-color` | — | Fallback `#ccc` |
| `--modal-closer-color-hover` | — | Fallback `#f00` |
| `--modal-closer-duration` | — | Fallback `.15s` |
| `--modal-closer-margin-right` | — | Fallback `.6rem` |
| `--modal-closer-margin-top` | — | Fallback `.6rem` |
| `--modal-closer-size` | — | Fallback `2.4rem` |
| `--modal-closer-width` | — | Fallback `.2rem` |
| `--modal-color` | — | Fallback `inherit` |
| `--modal-duration` | — | Fallback `.2s` |
| `--modal-easing` | — | Fallback `ease-out` |
| `--modal-margin-bottom` | — | Fallback `3vw` |
| `--modal-margin-left` | — | Fallback `3vw` |
| `--modal-margin-right` | — | Fallback `3vw` |
| `--modal-margin-top` | — | Fallback `3vw` |
| `--modal-max-width` | — | Fallback `80rem` |
| `--modal-overlay-background-color` | — | Fallback `#00000066` |
| `--modal-padding-bottom` | — | Fallback `clamp(2.5rem, 4vw, 5rem)` |
| `--modal-padding-left` | — | Fallback `clamp(2.5rem, 4vw, 5rem)` |
| `--modal-padding-right` | — | Fallback `clamp(2.5rem, 4vw, 5rem)` |
| `--modal-padding-top` | — | Fallback `clamp(2.5rem, 4vw, 5rem)` |

## src/react/slider.css

| Переменная | Объявление и область | Потребление в этом файле |
| --- | --- | --- |
| `--slider-indicators-bottom` | — | Fallback `1rem` |
| `--slider-indicators-gap` | — | Fallback `.3rem` |
| `--slider-indicators-height` | — | Fallback `var(--slider-point-size, .3rem)` |
| `--slider-indicators-init-opacity` | — | Fallback `0` |
| `--slider-indicators-left` | — | Fallback `1.2rem` |
| `--slider-indicators-right` | — | Fallback `1.2rem` |
| `--slider-indicators-top` | — | Fallback `auto` |
| `--slider-indicators-width` | — | Fallback `auto` |
| `--slider-object-fit` | — | Fallback `cover` |
| `--slider-point-color` | — | Fallback `#ffffff66` |
| `--slider-point-color-active` | — | Fallback `#fff` |
| `--slider-point-size` | — | Fallback `.3rem` |

