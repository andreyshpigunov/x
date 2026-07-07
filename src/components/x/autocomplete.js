/**
 * @fileoverview Autocomplete for dropdown: async load, render items, onSelect.
 *
 * Works with [x-dropdown-open] and [x-dropdown]: loadData fetches data, renderItem builds list HTML,
 * onSelect handles item choice. Debounced input, race-safe requests.
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

    this.dropdown = null;
    this.field = null;
    this.list = null;

    this._clicked = false;
    this._selecting = false;
    this._currentLoadId = 0;
    this._skipNextHideSelect = false;

    this._loadData = this._loadData.bind(this);
    this._keyHandler = this._keyHandler.bind(this);
    this._pointerDownHandler = this._pointerDownHandler.bind(this);
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

    if (!this.field.value.trim()) {
      this._reset();
    } else {
      this._defaultState();
    }

    this.field.addEventListener('focus', this.debouncedLoadData);
    this.field.addEventListener('input', this.debouncedLoadData);
    this.field.addEventListener('keydown', this._keyHandler);
    this.list.addEventListener('pointerdown', this._pointerDownHandler);
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
    this.field.removeEventListener('input', this.debouncedLoadData);
    this.field.removeEventListener('keydown', this._keyHandler);
    this.list.removeEventListener('pointerdown', this._pointerDownHandler);
    this.list.removeEventListener('click', this._clickHandler);
    this.dropdown.removeEventListener('dropdown:afterhide', this._hideHandler);

    this.field = null;
    this.list = null;
    this.dropdown = null;
    this.data = null;
  }

  _keyHandler(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.field?.blur();
    }
  }

  _pointerDownHandler(e) {
    if (e.target.closest('[data-item]')) {
      this._selecting = true;
    }
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

    this._skipNextHideSelect = true;

    try {
      const item = JSON.parse(el.dataset.item);
      this.onSelect(item);
    } catch (err) {
      console.error('Autocomplete: error parsing data-item JSON', err);
    }
  }

  _hideHandler() {
    if (this._skipNextHideSelect || this._clicked || this._selecting) {
      this._skipNextHideSelect = false;
      this._clicked = false;
      this._selecting = false;
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
    lib.render(this.list, this.loadingStateHtml);
  }

  _emptyState() {
    lib.render(this.list, this.emptyStateHtml);
  }

  _defaultState() {
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
