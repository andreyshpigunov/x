//
//	sticky.js
//	auto-x
//
//	Created by Andrey Shpigunov on 03.09.2024.
//


import { lib } from './lib';


class Sticky {
    init() {
        let stickies = lib.qsa('.sticky');
        if (stickies) {
            stickies.forEach(item => {
                const observer = new IntersectionObserver(
                    ([e]) => e.target.classList.toggle('sticky_on', e.intersectionRatio < 1),
                    {threshold: [1]}
                );
                observer.observe(item);
            })
        }
    }
}

export const sticky = new Sticky();
