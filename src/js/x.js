//
//  x.js / x
//  Small and simple CSS & JavaScript library with interesting features
//
//  Created by Andrey Shpigunov at 20.03.2025
//  All right reserved.
//


import { modal } from "../components/x/modal.js";
import { animate } from "../components/x/animate.js";
import { appear } from "../components/x/appear.js";
import { lazyload } from "../components/x/lazyload.js";
import { loadmore } from "../components/x/loadmore.js";
import { sheets } from "../components/x/sheets.js";
import { dropdown } from "../components/x/dropdown.js";
import { autocomplete } from "../components/x/autocomplete.js";
import { scroll } from "../components/x/scroll.js";
import { hover } from "../components/x/hover.js";
import { device } from "../components/x/device.js";
import { lib } from "../components/x/lib.js";
import { form } from "../components/x/form.js";
import { sticky } from "../components/x/sticky.js";
import { slider } from "../components/x/slider.js";
import { typograf } from "../components/x/typograf.js";


export class X {
  constructor() {
    this.modal = modal;
    this.animate = animate;
    this.appear = appear;
    this.lazyload = lazyload;
    this.loadmore = loadmore;
    this.sheets = sheets;
    this.dropdown = dropdown;
    this.autocomplete = autocomplete;
    this.scroll = scroll;
    this.hover = hover;
    this.device = device;
    this.lib = lib;
    this.render = lib.render.bind(lib);
    this.form = form;
    this.sticky = sticky;
    this.slider = slider;
    this.typograf = typograf;
    
    this._generation = 0;
    this._destroying = false;
    this.initialized = false;
  }
  
  destroy() {
    if (this._destroying) return;
    this._destroying = true;
    this._generation++;
    this.initialized = false;
    try {
      // Remove consumers before providers; shared modules remain independently usable.
      this.autocomplete.destroy(null, { reset: false });
      this.form.destroy();
      this.typograf.destroy();
      for (const name of ['hover', 'slider', 'sticky', 'scroll', 'dropdown', 'sheets', 'loadmore', 'lazyload', 'appear', 'animate', 'modal', 'device']) {
        this[name].destroy();
      }
    } finally { this._destroying = false; }
  }

  init() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (this.initialized || this._destroying) return;
    const generation = ++this._generation;
    this.initialized = true;
    try {
      for (const name of ['device', 'modal', 'animate', 'appear', 'lazyload', 'loadmore', 'sheets', 'dropdown', 'scroll', 'sticky', 'slider', 'hover']) {
        if (generation !== this._generation) return;
        this[name].init();
      }
    } catch (error) {
      if (generation === this._generation) this.destroy();
      throw error;
    }
  }
};

export const x = new X();

// Make 'x' as global variable
if (typeof window !== 'undefined') {
  window.x = x;

  // Shortcuts for selectors
  window.x.id = x.lib.id;
  window.x.qs = x.lib.qs;
  window.x.qsa = x.lib.qsa;
}
