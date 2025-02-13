//
//  x.js
//  x | Small and simple CSS & JavaScript library with interesting features
//  Created by Andrey Shpigunov at 12.02.2025
//  All right reserved.
//


import { modal    }  from "../components/x/modal";
import { animate  }  from "../components/x/animate";
import { appear   }  from "../components/x/appear";
import { lazyload }  from "../components/x/lazyload";
import { loadmore }  from "../components/x/loadmore";
import { sheets   }  from "../components/x/sheets";
import { scroll   }  from "../components/x/scroll";
import { hover    }  from "../components/x/hover";
import { device   }  from "../components/x/device";
import { lib      }  from "../components/x/lib";
import { form     }  from "../components/x/form";
import { sticky   }  from "../components/x/sticky";
import { slides   }  from "../components/x/slides";


class X {
  constructor() {
    this.modal    = modal;
    this.animate  = animate;
    this.appear   = appear;
    this.lazyload = lazyload;
    this.loadmore = loadmore;
    this.sheets   = sheets;
    this.scroll   = scroll;
    this.hover    = hover;
    this.device   = device;
    this.lib      = lib;
    this.render   = lib.render.bind(lib);
    this.form     = form;
    this.sticky   = sticky;
    this.slides   = slides;
    
    this.initialized = false;
  }
  
  init() {
    if (!this.initialized) {
      this.modal.init();
      this.animate.init();
      this.appear.init();
      this.lazyload.init();
      this.loadmore.init();
      this.sheets.init();
      this.scroll.init();
      this.sticky.init();
      this.slides.init();
      hover();
      
      this.initialized = true;
    }
  }
};

const x = new X();

// Make 'x' as global variable
window.x = x;

// Query selectors shorthands
window.qs  = x.lib.qs;
window.qsa = x.lib.qsa;
