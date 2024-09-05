//
//	animate.js
//	auto-x
//
//	Created by Andrey Shpigunov on 03.09.2024.
//
//
//  On scroll animations
//
//  <div class="element" data-animate='
//    {
//      "trigger": "element or selector",
//      "start": "120vh",
//      "end": "0vh",
//      "functionName": "coverOut",
//      "class": "fixed",
//      "classRemove": true
//    }
//  '>...</div>
//
//  trigger       selector of trigger element that we are tracking the position
//  start         animation start point (height from the top in px or vh)
//  end           animation end point (height from the top in px or vh)
//  functionName  name of the function that starts executing when the element
//                moves between "start" and "end"
//  class         class, added to a reference when "target" is between "start" and "end"
//  classRemove   whether to delete the "class" from the element after it leaves
//                the animation zone, by default false


import { lib } from './lib';


class Animate {
    
    init() {
        let animations = lib.qsa('[data-animate]');
        if (animations.length) {
            let animationsHash = {};
            
            animations.forEach((e, index) => {
                try {
                    let json = JSON.parse(e.dataset.animate);
                    if (json.hasOwnProperty('start')) {
                        let item = {};
                        
                        if (
                            json.hasOwnProperty('trigger') &&
                            lib.qs(json.trigger)
                        ) {
                            item.trigger = lib.qs(json.trigger);
                        } else {
                            item.trigger = e;
                        }
                        
                        item.element = e;
                        item.start = json.start;
                        item.end = json.end;
                        item.class = json.class;
                        item.classRemove = json.classRemove;
                        item.functionName = json.functionName;
                        
                        animationsHash[index] = item;
                    } else {
                        Object.keys(json).forEach(i => {
                            let item = {};
                            
                            if (
                                json[i].hasOwnProperty('trigger') &&
                                lib.qs(json[i].trigger)
                            ) {
                                item.trigger = lib.qs(json[i].trigger)
                            } else {
                                item.trigger = e;
                            }
                            
                            item.element = e;
                            item.start = json[i].start;
                            item.end = json[i].end;
                            item.class = json[i].class;
                            item.classRemove = json[i].classRemove;
                            item.functionName = json[i].functionName;
                            
                            animationsHash[index + i] = item;
                        });
                    }
                    
                    e.removeAttribute('data-animate');
                } catch (err) {
                    console.log('Error', err);
                }
            });
            
            if (Object.keys(animationsHash).length) {
                this._scroll(animationsHash);
                document.addEventListener('scroll', () => {
                    this._scroll(animationsHash);
                }, { passive: true });
                // If animated not in body scroll, for example —
                // scrollable <div> with animated elements
                if (lib.qs('.animate-scrollarea')) {
                    lib.qs('.animate-scrollarea').addEventListener('scroll', () => {
                            this._scroll(animationsHash);
                        }, { passive: true });
                }
            }
        }
    }
    
    _scroll(animationsHash) {
        Object.keys(animationsHash).forEach(i => {
            let item = animationsHash[i],
                offset = item.trigger.getBoundingClientRect(),
                start,
                end;
            
            if (item.start.match(/px/)) start = item.start.replace('px', '');
            if (item.start.match(/vh/)) start = this._vh2px(item.start.replace('vh', ''));
            if (item.start.match(/%/)) start = this._vh2px(item.start.replace('%', ''));
            if (item.end.match(/px/)) end = item.end.replace('px', '');
            if (item.end.match(/vh/)) end = this._vh2px(item.end.replace('vh', ''));
            if (item.end.match(/%/)) end = this._vh2px(item.end.replace('%', ''));
            
            item.duration = start - end;
            
            if (offset.top <= start && offset.top >= end) {
                if (item.class != null) {
                    item.element.classList.add(item.class);
                }
                if (typeof window[item.functionName] === 'function') {
                    item.progress = (start - offset.top) / item.duration;
                    item.progress = item.progress.toFixed(4);
                    window[item.functionName](item);
                }
            } else {
                if (
                    item.class != null &&
                    item.classRemove == true &&
                    item.element.classList.contains(item.class)
                ) {
                    item.element.classList.remove(item.class);
                }
                if (typeof window[item.functionName] === 'function') {
                    if (offset.top > start) {
                        item.progress = 0;
                        window[item.functionName](item);
                    }
                    
                    if (offset.top < end) {
                        item.progress = 1;
                        window[item.functionName](item);
                    }
                }
            }
        })
    }
    
    _vh2px(value) {
        let w = window,
            d = document,
            e = d.documentElement,
            g = d.getElementsByTagName('body')[0],
            // x = w.innerWidth || e.clientWidth || g.clientWidth,
            y = w.innerHeight || e.clientHeight || g.clientHeight,
            result = (y * value) / 100;
        return result;
    }
    
}

export const animate = new Animate();
