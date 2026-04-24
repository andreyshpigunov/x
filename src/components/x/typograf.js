//
//  typograf.js
//  Типограф
//
//  Created by Andrey Shpigunov at 24.04.2026
//  All right reserved.
//


class Typograf {
  #skipTags = ['code', 'pre', 'script', 'style'];
  
  #decimal = {
    '1/2': '½',
    '1/3': '⅓',
    '1/4': '¼',
    '1/5': '⅕',
    '1/6': '⅙',
    '1/7': '⅐',
    '1/8': '⅛',
    '1/9': '⅑',
    '1/10': '⅒',
    '2/3': '⅔',
    '2/5': '⅖',
    '3/4': '¾',
    '3/5': '⅗',
    '3/8': '⅜',
    '4/5': '⅘',
    '5/6': '⅚',
    '5/8': '⅝',
    '7/8': '⅞'
  };
  
  #superscript = {
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
    '+': '⁺',
    '-': '⁻',
    '=': '⁼',
    '(': '⁽',
    ')': '⁾',
    'o': '°',
    'о': '°'
  };
  
  #processText(text) {
    let t = text;
    
    // Ellipsis
    t = t.replace(/\.{3}/g, '…');
    
    // Special symbols
    t = t.replace(/\(c\)|\(с\)/gi, '©')
      .replace(/\(r\)/gi, '®')
      .replace(/\(tm\)/gi, '™')
      .replace(/\(р\)/gi, '₽');
    
    // Fractions
    t = t.replace(/\b([0-9]+\/(?:[0-9]+|10))\b/g, (m) => this.#decimal[m] || m);
    
    // Superscripts
    t = t.replace(/(\S)\^([0-9+\-=\(\)oо])/g, (m, base, exp) => base + (this.#superscript[exp] || exp));
    
    // Minus in numbers
    t = t.replace(/(?<=\d)-(?=\d)/g, '−');
    
    // Em dash with NBSP
    t = t.replace(/(^|\s)-(\s)/g, '$1—$2')
      .replace(/\s+—/g, '\u00A0—');
    
    // NBSP for addresses
    t = t.replace(
      /(^|\s)(г|ул|д|стр|кв|пл|пер|пр|ш|мкр)\s+(?=\S)/gi,
      '$1$2\u00A0'
    );
    
    // NBSP after ANY short word (1–3 chars)
    t = t.replace(/(^|[ \t])([A-Za-zА-Яа-яЁё0-9]{1,3})[ \t]+(?=\S)/g, '$1$2\u00A0');
    
    // NBSP before particles
    t = t.replace(/\s+(же?|л[иь]|бы?)(?=[\s.,!?;:])/gi, '\u00A0$1');
    
    // Quotes
    t = t.replace(/"(?=\S)/g, '«')
      .replace(/(?<=\S)"/g, '»');
    
    return t;
  }
  
  process(html) {
    const skipStack = [];
    const tagRegex = /(<\/?([a-z0-9]+)[^>]*>)|([^<]+)/gi;
    
    return html.replace(tagRegex, (match, tag, tagName, text) => {
      if (tag) {
        const lowerTag = tagName ? tagName.toLowerCase() : '';
        if (this.#skipTags.includes(lowerTag)) {
          if (tag.startsWith('</')) {
            skipStack.pop();
          } else if (!tag.endsWith('/>')) {
            skipStack.push(lowerTag);
          }
        }
        return tag;
      } else {
        if (skipStack.length > 0) return text;
        return this.#processText(text);
      }
    });
  }
  
  /**
   * Универсальный режим:
   * 1. Обрабатывает статичный текст (например .typograf)
   * 2. Навешивается на поля для live-обработки (например .typograf-live)
   */
  live(staticSelector = '.typograf', interactiveSelector = '.typograf-live', root = document) {
    // 1. Статическая обработка
    root.querySelectorAll(staticSelector).forEach(el => {
      if (el.isContentEditable) {
        el.innerHTML = this.process(el.innerHTML);
      } else {
        el.textContent = this.process(el.textContent);
      }
    });
    
    // 2. Live-обработка полей
    root.addEventListener('input', e => {
      const el = e.target;
      if (!el.matches(interactiveSelector)) return;
      if (el.disabled || el.readOnly) return;
      
      // INPUT / TEXTAREA
      if (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text')) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newValue = this.process(el.value);
        if (newValue !== el.value) {
          el.value = newValue;
          el.setSelectionRange(start, end);
        }
      }
      // CONTENTEDITABLE
      else if (el.isContentEditable) {
        const sel = window.getSelection();
        const range = sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
        const newHTML = this.process(el.innerHTML);
        if (newHTML !== el.innerHTML) {
          el.innerHTML = newHTML;
          if (range) this.#restoreCaret(el, range);
        }
      }
    });
  }
  
  #restoreCaret(el, oldRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    
    const range = document.createRange();
    
    // Ищем соответствующие позиции в новом DOM
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    let currentNode, charCount = 0,
      startNode = null,
      endNode = null;
    let startOffset = oldRange.startOffset,
      endOffset = oldRange.endOffset;
    let foundStart = false;
    
    while ((currentNode = walker.nextNode())) {
      if (!foundStart && charCount + currentNode.length >= startOffset) {
        startNode = currentNode;
        startOffset = startOffset - charCount;
        foundStart = true;
      }
      if (charCount + currentNode.length >= endOffset) {
        endNode = currentNode;
        endOffset = endOffset - charCount;
        break;
      }
      charCount += currentNode.length;
    }
    
    if (startNode && endNode) {
      range.setStart(startNode, Math.max(0, startOffset));
      range.setEnd(endNode, Math.max(0, endOffset));
    } else {
      range.selectNodeContents(el);
      range.collapse(false);
    }
    
    sel.addRange(range);
  }
}

/**
 * Singleton export of Typograf.
 * @type {Sticky}
 */
export const typograf = new Typograf();