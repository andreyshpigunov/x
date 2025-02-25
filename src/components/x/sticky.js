//
//  sticky.js
//  x | Sticky element on scroll
//  Created by Andrey Shpigunov at 12.02.2025
//  All right reserved.
//
//
//  Add 'sticky_on' class to 'sticky' element.
//


import { lib } from './lib';


class Sticky {
  init() {
    let stickies = lib.qsa('.sticky');
    if (stickies.length) {
      for (let item of stickies) {
        const observer = new IntersectionObserver(
          ([e]) => lib.switchClass(e.target, e.intersectionRatio < 1, 'sticky_on'), { threshold: 1, rootMargin: '-1px 0px 0px 0px', root: document }
        );
        observer.observe(item);
      }
    }
  }
}

export const sticky = new Sticky();
