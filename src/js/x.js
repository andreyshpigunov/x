//
//  _auto.js
//  auto
//
//  Created by andreyshpigunov on 25.05.2021.
//
//  CSS & JS small library for using at the heart of the website
//


import { hover    }  from "../components/x/hover";
import { lazyload }  from "../components/x/lazyload";
import { animate  }  from "../components/x/animate";
import { appear   }  from "../components/x/appear";
import { loadmore }  from "../components/x/loadmore";
import { device   }  from "../components/x/device";
import { modal    }  from "../components/x/modal";
import { sheets   }  from "../components/x/sheets";
import { scroll   }  from "../components/x/scroll";
import { lib      }  from "../components/x/lib";
import { form     }  from "../components/x/form";
import { slider   }  from "../components/x/slider";
import { sticky   }  from "../components/x/sticky";


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
        this.form     = form;
        this.sticky   = sticky;
        this.slider   = slider;
        
        this.initialized = false;
    }
    
    init() {
        if (!this.initialized) {
            device();
            hover();
            this.modal.init();
            this.animate.init();
            this.appear.init();
            this.lazyload.init();
            this.loadmore.init();
            this.sheets.init();
            this.scroll.init();
            this.sticky.init();
            this.slider.init();
            
            this.initialized = true;
        }
    }
};

const x = new X();
window.x = x;

// Query selectors shorthands
window.qs  = x.lib.qs;
window.qsa = x.lib.qsa;
window.qse = x.lib.qse;
