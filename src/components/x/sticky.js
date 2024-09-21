//
//	sticky.js
//	x
//
//	Created by Andrey Shpigunov on 20.09.2024.
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
                    ([e]) => lib.switchClass(e.target, e.intersectionRatio < 1, 'sticky_on'),
                    // ([e]) => e.target.classList.toggle('sticky_on', e.intersectionRatio < 1),
                    { threshold: [1] }
                );
                observer.observe(item);
            }
        }
    }
}

export const sticky = new Sticky();
