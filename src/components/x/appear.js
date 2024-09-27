//
//	appear.js
//	x
//
//	Created by Andrey Shpigunov on 11.09.2024.
//
//  Set the 'appeared class for elements that have appeared at least once
//  in the viewport. And the 'visible' class for elements in the viewport.
//
//  init() - initialize appear observer
//  update() - update observers if DOM changed
//


import { lib } from './lib';


class Appear {
    
    constructor() {
        this.items = [];
        this.classAppeared = 'appeared';
        this.classVisible = 'visible';
        this.observer = null;
        
        this.eventVisible = new CustomEvent('visible');
        this.eventInvisible  = new CustomEvent('invisible');
    }
    
    init() {
        this.items = lib.qsa('[x-appear]');
        if (this.items.length) {
            // Remove attribute
            // for (let item of this.items) {
                // item.removeAttribute('x-appear')
            // }
            // Observe items
            let observerCallback = entries => {
                for (let entry of entries) {
                    if (entry.isIntersecting) {
                        if (
                            this.classAppeared != null &&
                            !entry.target.classList.contains(this.classAppeared)
                        ) {
                            entry.target.classList.add(this.classAppeared);
                        }
                        if (this.classVisible != null) {
                            entry.target.classList.add(this.classVisible);
                            entry.target.dispatchEvent(this.eventVisible);
                        }
                    } else {
                        if (
                            this.classVisible != null &&
                            entry.target.classList.contains(this.classVisible)
                        ) {
                            entry.target.classList.remove(this.classVisible);
                            entry.target.dispatchEvent(this.eventInvisible);
                        }
                    }
                }
            }
            this.observer = new IntersectionObserver(observerCallback);
            this.items.forEach(item => this.observer.observe(item));
        }
    }
    
    update() {
        this.items.forEach(item => this.observer.observe(item));
    }
    
}

export const appear = new Appear();
