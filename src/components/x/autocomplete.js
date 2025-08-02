import { lib } from './lib';

class Autocomplete {
  
  emptyStateHtml = `<li><span class="op4">Ничего не найдено</span></li>`;
  defaultStateHtml = `<li><span class="op4">Начните печатать</span></li>`;
  loadingStateHtml = `<li><span class="op4">Загрузка...</span></li>`;
  
  init(dropdownId, options) {
    this.emptyStateHtml = options.emptyStateHtml || this.emptyStateHtml;
    this.defaultStateHtml = options.defaultStateHtml || this.defaultStateHtml;
    this.loadingStateHtml = options.loadingStateHtml || this.loadingStateHtml;
    
    this.dropdown = x.id(dropdownId);
    this.field = x.qs('[x-dropdown-open]', this.dropdown);
    this.list = x.qs('[x-dropdown]', this.dropdown);
    
    this.data = options.data || null;
    this.loadData = options.loadData || null;
    this.mapData = options.mapData || null;
    this.renderItem = options.renderItem || null;
    this.onSelect = options.onSelect || null;
    this.resetFunc = options.resetFunc || null;
    
    this._loadData = this._loadData.bind(this);
    this.debouncedLoadData = x.lib.debounce(this._loadData, 400);
    
    this.keyHandler = this._keyHandler.bind(this);
    this.clickHandler = this._clickHandler.bind(this);
    this.hideHandler = this._hideHandler.bind(this);
    
    if (this.field?.value == '') {
      this._reset();
    } else {
      this._defaultState();
    }
    this.field.addEventListener('focus', this.debouncedLoadData);
    this.field.addEventListener('input', this.debouncedLoadData);
    this.field.addEventListener('keydown', this.keyHandler);
    this.list.addEventListener('click', this.clickHandler);
    this.dropdown.addEventListener('dropdown:afterhide', this.hideHandler);
  }
  
  destroy() {
    this._reset();
    this.field.removeEventListener('focus', this.debouncedLoadData);
    this.field.removeEventListener('input', this.debouncedLoadData);
    this.field.removeEventListener('keydown', this.keyHandler);
    this.list.removeEventListener('click', this.clickHandler);
    this.dropdown.removeEventListener('dropdown:afterhide', this.hideHandler);
  }
  
  _keyHandler(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.field.blur();
    }
  }
  
  _clickHandler(e) {
    if (this._clicked) return;
    this._clicked = true;
    
    const el = e.target.closest('[data-item]');
    if (el) {
      try {
        const item = JSON.parse(el.dataset.item);
        this.onSelect(item);
      } catch(err) {
        console.error('Error parsing JSON');
      }
    } else {
      console.log('Empty data-item');
    }
  }
  
  _hideHandler() {
    if (this._clicked) {
      this._clicked = false;
      return;
    }
    
    if (!this.data || !this.data.length) {
      this._reset();
      return;
    }
    this._loadingState();
    this.onSelect(this.data[0]);
  }
  
  _loadingState() {
    x.lib.render(this.list, this.loadingStateHtml);
  }
  
  _emptyState() {
    x.lib.render(this.list, this.emptyStateHtml);
  }
  
  _defaultState() {
    x.lib.render(this.list, this.defaultStateHtml);
  }
  
  _reset() {
    this.resetFunc();
    this.data = null;
    this._defaultState();
  }
  
  async _loadData() {
    if (this.field?.value == '') {
      this._reset();
      return;
    } else {
      this._loadingState();
    }
    
    try {
      this._currentLoadId = Date.now();
      const loadId = this._currentLoadId;
      
      this.data = await this.loadData(this);
      
      if (loadId !== this._currentLoadId) return;
      
      this.data = this.mapData(this.data);
      this.render();
    } catch(err) {
      this._reset();
      console.error('Data loading error:', err);
    }
  }
  
  async render() {
    if (!this.data) {
      this._reset();
      return;
    }
    
    if (!this.data.length) {
      this._emptyState();
      return;
    }
    
    const html = this.data.map(this.renderItem).join('');
    
    x.lib.render(this.list, html);
  }
}

export const autocomplete = new Autocomplete();
