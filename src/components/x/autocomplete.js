/**
 * @fileoverview Autocomplete for dropdown: async load, render items, onSelect.
 *
 * Works with [x-dropdown-open] and [x-dropdown]: loadData fetches data, renderItem builds list HTML,
 * onSelect handles item choice. Debounced input, race-safe requests, pointer and keyboard navigation.
 *
 * Requires dropdown.js to be loaded on the page (same document) for the dropdown to open/close.
 *
 * Exported singleton: `autocomplete`
 *
 * Public API:
 *
 * - `autocomplete.init(dropdownId, options)` – Binds autocomplete instance to dropdown by id.
 * - `autocomplete.destroy(dropdownId)` – Removes one autocomplete instance.
 * - `autocomplete.destroy()` – Removes all autocomplete instances.
 *
 * Keyboard: ArrowDown/ArrowUp cycle through suggestions, Enter selects the active suggestion,
 * Escape closes without selection. Focus remains on the field and active options are exposed through
 * combobox/listbox ARIA semantics.
 *
 * SSR-safe: init/destroy no-op when window is undefined.
 *
 * @example
 * // Vanilla JS — plain HTML
 * // index.html:
 * // <div id="searchDropdown">
 * //   <input x-dropdown-open type="text" placeholder="Search…" />
 * //   <ul x-dropdown></ul>
 * // </div>
 * //
 * // <script type="module">
 * //   import { autocomplete } from './src/components/x/autocomplete.js';
 * //   // dropdown.js must be loaded too (for open/close behavior)
 * //   window.addEventListener('DOMContentLoaded', () => {
 * //     autocomplete.init('searchDropdown', {
 * //       loadData: async (ctx) => {
 * //         const q = ctx.field.value.trim();
 * //         const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
 * //         return r.json();
 * //       },
 * //       renderItem: (item) => `<li data-item='${JSON.stringify(item)}'>${item.name}</li>`,
 * //       selectFirstOnBlur: false,
 * //       onSelect: (item) => { console.log('selected', item); }
 * //     });
 * //   });
 * // </script>
 *
 * @author Andrey Shpigunov
 * @version 0.4
 * @since 2026-02-02
 */


import { lib } from './lib.js';

class AutocompleteInstance {
  constructor(dropdownId, options = {}) {
    this.dropdownId = dropdownId;
    this.emptyStateHtml = options.emptyStateHtml ?? `<li><span class="op4">Ничего не найдено</span></li>`;
    this.defaultStateHtml = options.defaultStateHtml ?? `<li><span class="op4">Начните печатать</span></li>`;
    this.loadingStateHtml = options.loadingStateHtml ?? `<li><span class="op4">Загрузка...</span></li>`;

    this.data = options.data ?? null;
    this.loadData = options.loadData ?? null;
    this.mapData = options.mapData ?? null;
    this.renderItem = options.renderItem ?? null;
    this.onSelect = options.onSelect ?? null;
    this.resetFunc = options.resetFunc ?? null;
    this.selectFirstOnBlur = options.selectFirstOnBlur ?? true;

    this.dropdown = null;
    this.field = null;
    this.list = null;

    this._clicked = false;
    this._selecting = false;
    this._currentLoadId = 0;
    this._skipNextHideSelect = false;
    this._activeItem = null;
    this._activeIndex = -1;
    this._originalAria = null;

    this._loadData = this._loadData.bind(this);
    this._inputHandler = this._inputHandler.bind(this);
    this._keyHandler = this._keyHandler.bind(this);
    this._pointerDownHandler = this._pointerDownHandler.bind(this);
    this._pointerOverHandler = this._pointerOverHandler.bind(this);
    this._clickHandler = this._clickHandler.bind(this);
    this._hideHandler = this._hideHandler.bind(this);

    this.debouncedLoadData = lib.debounce(this._loadData, 400);
  }

  init() {
    if (typeof window === 'undefined') return false;
    if (!this.dropdownId || typeof this.dropdownId !== 'string') return false;

    this.dropdown = lib.id(this.dropdownId);
    if (!this.dropdown) return false;

    this.field = lib.qs('[x-dropdown-open]', this.dropdown);
    this.list = lib.qs('[x-dropdown]', this.dropdown);
    if (!this.field || !this.list) return false;

    this._setupAria();

    if (!this.field.value.trim()) {
      this._reset();
    } else {
      this._defaultState();
    }

    this.field.addEventListener('focus', this.debouncedLoadData);
    this.field.addEventListener('input', this._inputHandler);
    this.field.addEventListener('keydown', this._keyHandler);
    this.list.addEventListener('pointerdown', this._pointerDownHandler);
    this.list.addEventListener('pointerover', this._pointerOverHandler);
    this.list.addEventListener('click', this._clickHandler);
    this.dropdown.addEventListener('dropdown:afterhide', this._hideHandler);

    // If init happens during focus, the current focus event has already fired.
    // Load suggestions explicitly so a prefilled field behaves the same way.
    if (document.activeElement === this.field && this.field.value.trim()) {
      this._loadData();
    }

    return true;
  }

  destroy({ reset = true } = {}) {
    if (typeof window === 'undefined') return;
    if (!this.field || !this.list || !this.dropdown) return;

    if (reset) {
      this._reset();
    }

    this.field.removeEventListener('focus', this.debouncedLoadData);
    this.field.removeEventListener('input', this._inputHandler);
    this.field.removeEventListener('keydown', this._keyHandler);
    this.list.removeEventListener('pointerdown', this._pointerDownHandler);
    this.list.removeEventListener('pointerover', this._pointerOverHandler);
    this.list.removeEventListener('click', this._clickHandler);
    this.dropdown.removeEventListener('dropdown:afterhide', this._hideHandler);

    this._clearActiveItem();
    this._restoreAria();

    this.field = null;
    this.list = null;
    this.dropdown = null;
    this.data = null;
  }

  _keyHandler(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!this._isOpen()) return;
      e.preventDefault();
      const items = this._getItems();
      if (!items.length) return;

      const direction = e.key === 'ArrowDown' ? 1 : -1;
      const currentIndex = items.indexOf(this._activeItem);
      const nextIndex = currentIndex === -1
        ? (direction === 1 ? 0 : items.length - 1)
        : (currentIndex + direction + items.length) % items.length;
      this._setActiveItem(items[nextIndex], nextIndex);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (this._activeItem) {
        this._selectItem(this._activeItem);
      }
      this.field?.blur();
      return;
    }

    if (e.key === 'Escape') {
      if (!this._isOpen()) return;
      e.preventDefault();
      this._skipNextHideSelect = true;
      this._clearActiveItem();
      this.field?.blur();
    }
  }

  _inputHandler() {
    this._clearActiveItem();
    this.debouncedLoadData();
  }

  _pointerDownHandler(e) {
    const item = e.target.closest('[data-item]');
    if (item) {
      this._selecting = true;
      this._setActiveItem(item);
    }
  }

  _pointerOverHandler(e) {
    const item = e.target.closest('[data-item]');
    if (item) this._setActiveItem(item, null, false);
  }

  _clickHandler(e) {
    if (this._clicked) return;
    this._clicked = true;

    const el = e.target.closest('[data-item]');
    if (!el || !this.onSelect) {
      this._clicked = false;
      this._selecting = false;
      return;
    }

    this._selectItem(el);
  }

  _hideHandler() {
    this._clearActiveItem();

    if (this._skipNextHideSelect || this._clicked || this._selecting) {
      this._skipNextHideSelect = false;
      this._clicked = false;
      this._selecting = false;
      return;
    }

    if (!this.selectFirstOnBlur) {
      this._reset();
      return;
    }

    if (!this.data?.length || !this.onSelect) {
      this._reset();
      return;
    }

    this._loadingState();
    this.onSelect(this.data[0]);
  }

  _loadingState() {
    this._clearActiveItem();
    lib.render(this.list, this.loadingStateHtml);
  }

  _emptyState() {
    this._clearActiveItem();
    lib.render(this.list, this.emptyStateHtml);
  }

  _defaultState() {
    this._clearActiveItem();
    lib.render(this.list, this.defaultStateHtml);
  }

  _reset() {
    if (this.resetFunc) {
      this.resetFunc();
    }
    this.data = null;
    this._defaultState();
  }

  async _loadData() {
    if (!this.field || !this.field.value.trim()) {
      this._reset();
      return;
    }

    if (!this.loadData) {
      this._defaultState();
      return;
    }

    this._loadingState();

    const loadId = Date.now();
    this._currentLoadId = loadId;

    try {
      const data = await this.loadData(this);
      if (loadId !== this._currentLoadId) return;

      this.data = this.mapData ? this.mapData(data) : data;
      this.render();
    } catch (err) {
      if (loadId === this._currentLoadId) this._reset();
      console.error('Autocomplete: load error', err);
    }
  }

  render() {
    if (!this.data) {
      this._reset();
      return;
    }

    if (!this.data.length) {
      this._emptyState();
      return;
    }

    if (!this.renderItem) {
      this._defaultState();
      return;
    }

    const html = this.data.map(this.renderItem).join('');
    lib.render(this.list, html);
    this._prepareItems();
  }

  _setupAria() {
    const fieldAttributes = ['role', 'aria-autocomplete', 'aria-activedescendant', 'aria-controls'];
    this._originalAria = {
      field: new Map(fieldAttributes.map(name => [name, this.field.getAttribute(name)])),
      listRole: this.list.getAttribute('role')
    };

    if (!this.list.id) this.list.id = lib.makeId();
    this.field.setAttribute('role', 'combobox');
    this.field.setAttribute('aria-autocomplete', 'list');
    this.field.setAttribute('aria-controls', this.list.id);
    this.field.removeAttribute('aria-activedescendant');
    this.list.setAttribute('role', 'listbox');
  }

  _restoreAria() {
    if (!this._originalAria || !this.field || !this.list) return;

    this._originalAria.field.forEach((value, name) => {
      if (value == null) this.field.removeAttribute(name);
      else this.field.setAttribute(name, value);
    });
    if (this._originalAria.listRole == null) this.list.removeAttribute('role');
    else this.list.setAttribute('role', this._originalAria.listRole);
    this._originalAria = null;
  }

  _getItems() {
    return this.list ? Array.from(this.list.querySelectorAll('[data-item]')) : [];
  }

  _isOpen() {
    return Boolean(this.dropdown?.classList.contains('dropdown_open'));
  }

  _prepareItems() {
    this._clearActiveItem();
    const items = this._getItems();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.id) item.id = `${this.list.id}-option-${i + 1}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
    }
  }

  _setActiveItem(item, index = null, scroll = true) {
    if (!item || item === this._activeItem) return;
    this._clearActiveItem();

    const items = this._getItems();
    const itemIndex = index ?? items.indexOf(item);
    if (itemIndex < 0) return;

    if (!item.id) item.id = `${this.list.id}-option-${itemIndex + 1}`;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', 'true');
    item.classList.add('active');
    this.field.setAttribute('aria-activedescendant', item.id);
    this._activeItem = item;
    this._activeIndex = itemIndex;

    if (scroll && typeof item.scrollIntoView === 'function') {
      item.scrollIntoView({ block: 'nearest' });
    }
  }

  _clearActiveItem() {
    if (this._activeItem) {
      this._activeItem.classList.remove('active');
      this._activeItem.setAttribute('aria-selected', 'false');
    }
    this.field?.removeAttribute('aria-activedescendant');
    this._activeItem = null;
    this._activeIndex = -1;
  }

  _selectItem(el) {
    if (!el || !this.onSelect) return false;
    this._skipNextHideSelect = true;

    try {
      const item = JSON.parse(el.dataset.item);
      this.onSelect(item);
      return true;
    } catch (err) {
      console.error('Autocomplete: error parsing data-item JSON', err);
      return false;
    }
  }
}

class AutocompleteManager {
  constructor() {
    this.instances = new Map();
  }

  init(dropdownId, options = {}) {
    if (typeof window === 'undefined') return;
    if (!dropdownId || typeof dropdownId !== 'string') return;

    this.destroy(dropdownId, { reset: false });

    const instance = new AutocompleteInstance(dropdownId, options);
    if (instance.init()) {
      this.instances.set(dropdownId, instance);
    }
  }

  destroy(dropdownId = null, options = {}) {
    if (typeof window === 'undefined') return;

    if (dropdownId) {
      const instance = this.instances.get(dropdownId);
      if (!instance) return;

      instance.destroy(options);
      this.instances.delete(dropdownId);
      return;
    }

    this.instances.forEach(instance => {
      instance.destroy(options);
    });
    this.instances.clear();
  }

  get(dropdownId) {
    return this.instances.get(dropdownId) || null;
  }
}

export const autocomplete = new AutocompleteManager();
