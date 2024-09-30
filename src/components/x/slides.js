//
//	slides.js
//	x
//
//	Created by Andrey Shpigunov on 20.09.2024.
//
//  Simple photos onmouseover slides
//  <div x-slides="['photo1.jpg','photo2.jpg','photo3.jpg']">
//    <img src="photo1.jpg"/>
//  </div>


import { device } from './device';
import { lib } from './lib';


class Slides {
    
    constructor() {
        // ...
    }
    
    init() {
        
        let sliders = lib.qsa('[x-slides]');
        if (sliders.length) {
            if (device.touch) {
                // Touch device, remove 'x-slides' attribute
                for (let slider of sliders) slider.removeAttribute('x-slides');
            } else {
                let slidersObject = {};
                
                sliders.forEach((e, index) => {
                    // Get array images
                    let slides = JSON.parse(e.getAttribute('x-slides'));
                    // Get cover
                    let img = lib.qs('img', e);
                    let cover = img.getAttribute('src');
                    // Add cover to the start of array
                    slides.unshift(cover);
                    // Create array without duplicates
                    let array = [...new Set(slides)]
                    let count = array.length;
                    
                    // Add data to object
                    slidersObject[index] = {
                        element: e,
                        rect: e.getBoundingClientRect(),
                        img: img,
                        array: array,
                        count: count
                    };
                    
                    // Remove 'x-slides' attribute
                    e.removeAttribute('x-slides');
                });
                
                // Add event listeners
                if (Object.values(slidersObject).length) {
                    for (let item of Object.values(slidersObject)) {
                        if (item.array.length) {
                            item.element.addEventListener('mousemove', event => {
                                this._update(event, item);
                            });
                            item.element.addEventListener('mouseout', () => {
                                this._reset(item);
                            });
                        }
                    }
                }
            }
        }
    }
    
    _update(event, item) {
        let x = event.clientX - item.rect.left;
        if (x < 0) x = 0;
        let slide = Math.floor(x / (item.rect.width / item.count));
        item.img.src = item.array[slide];
    }
    
    _reset(item) {
        item.img.src = item.array[0];
    }
    
}

export const slides = new Slides();
