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
 * - `autocomplete.init(dropdownId, options)` – Binds to dropdown by id; options: loadData, mapData, renderItem, onSelect, resetFunc, emptyStateHtml, defaultStateHtml, loadingStateHtml.
 * - `autocomplete.destroy()` – Removes listeners and resets state.
 *
 * Next.js: call init() in useEffect after mount; call destroy() in cleanup on route change.
 * SSR-safe: init/destroy no-op when window is undefined.
 *
 * @example
 * // Next.js — in a component with a dropdown by id="searchDropdown"
 * useEffect(() => {
 *   autocomplete.init('searchDropdown', {
 *     loadData: async () => fetch('/api/search').then(r => r.json()),
 *     renderItem: (item) => `<li data-item='${JSON.stringify(item)}'>${item.name}</li>`,
 *     onSelect: (item) => { setValue(item.name); }
 *   });
 *   return () => autocomplete.destroy();
 * }, []);
 *
 * @author Andrey Shpigunov
 * @version 0.4
 * @since 2026-02-02
 */
import { lib } from './lib';

class Autocomplete {
  emptyStateHtml = `<li><span class="op4">Ничего не найдено</span></li>`;
  defaultStateHtml = `<li><span class="op4">Начните печатать</span></li>`;
  loadingStateHtml = `<li><span class="op4">Загрузка...</span></li>`;

  constructor() {
    this._clicked = false;
    this._currentLoadId = 0;
    this._loadData = this._loadData.bind(this);
    this._keyHandler = this._keyHandler.bind(this);
    this._clickHandler = this._clickHandler.bind(this);
    this._hideHandler = this._hideHandler.bind(this);
  }

  init(dropdownId, options = {}) {
    if (typeof window === 'undefined') return;
    if (!dropdownId || typeof dropdownId !== 'string') return;

    this.emptyStateHtml = options.emptyStateHtml ?? this.emptyStateHtml;
    this.defaultStateHtml = options.defaultStateHtml ?? this.defaultStateHtml;
    this.loadingStateHtml = options.loadingStateHtml ?? this.loadingStateHtml;

    this.dropdown = lib.id(dropdownId);
    if (!this.dropdown) return;

    this.field = lib.qs('[x-dropdown-open]', this.dropdown);
    this.list = lib.qs('[x-dropdown]', this.dropdown);
    if (!this.field || !this.list) return;

    this.data = options.data ?? null;
    this.loadData = options.loadData ?? null;
    this.mapData = options.mapData ?? null;
    this.renderItem = options.renderItem ?? null;
    this.onSelect = options.onSelect ?? null;
    this.resetFunc = options.resetFunc ?? null;

    this.debouncedLoadData = lib.debounce(this._loadData, 400);

    if (!this.field.value.trim()) {
      this._reset();
    } else {
      this._defaultState();
    }

    this.field.addEventListener('focus', this.debouncedLoadData);
    this.field.addEventListener('input', this.debouncedLoadData);
    this.field.addEventListener('keydown', this._keyHandler);
    this.list.addEventListener('click', this._clickHandler);
    this.dropdown.addEventListener('dropdown:afterhide', this._hideHandler);
  }
  
  destroy() {
    if (typeof window === 'undefined') return;
    if (!this.field || !this.list || !this.dropdown) return;

    this._reset();
    this.field.removeEventListener('focus', this.debouncedLoadData);
    this.field.removeEventListener('input', this.debouncedLoadData);
    this.field.removeEventListener('keydown', this._keyHandler);
    this.list.removeEventListener('click', this._clickHandler);
    this.dropdown.removeEventListener('dropdown:afterhide', this._hideHandler);
  }
  
  _keyHandler(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.field?.blur();
    }
  }

  _clickHandler(e) {
    if (this._clicked) return;
    this._clicked = true;

    const el = e.target.closest('[data-item]');
    if (!el || !this.onSelect) {
      setTimeout(() => { this._clicked = false; }, 0);
      return;
    }

    try {
      const item = JSON.parse(el.dataset.item);
      this.onSelect(item);
    } catch (err) {
      console.error('Autocomplete: error parsing data-item JSON', err);
    }
    setTimeout(() => { this._clicked = false; }, 0);
  }
  
  _hideHandler() {
    if (this._clicked) {
      this._clicked = false;
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

export const autocomplete = new Autocomplete();
