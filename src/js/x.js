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


class X {
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
    
    this.initialized = false;
  }
  
  init() {
    if (!this.initialized) {
      this.device.init();
      this.modal.init();
      this.animate.init();
      this.appear.init();
      this.lazyload.init();
      this.loadmore.init();
      this.sheets.init();
      this.dropdown.init();
      this.scroll.init();
      this.sticky.init();
      this.slider.init();
      hover.init();
      
      this.initialized = true;
    }
  }
};

const x = new X();

// Make 'x' as global variable
window.x = x;

// Shortcuts for selectors
window.x.id = x.lib.id;
window.x.qs = x.lib.qs;
window.x.qsa = x.lib.qsa;
