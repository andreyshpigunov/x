//
//	appear.js
//	auto-x
//
//	Created by Andrey Shpigunov on 03.09.2024.
//
//
//  Set the 'appeared class for elements that have appeared at least once
//  in the viewport. And the 'visible' class for elements in the viewport.
//


class Appear {
    
    constructor() {
        this.items = null;
        this.classIsAppeared = 'isAppeared';
        this.classAppeared = 'appeared';
        this.classVisible = 'visible';
        this.observer = null;
        
        this.eventVisible = new CustomEvent('visible');
        this.eventInvisible  = new CustomEvent('invisible');
    }
    
    init() {
        this.items = document.querySelectorAll('.' + this.classIsAppeared);
        if (this.items.length) {
            
            // Remove initial class 'classIsAppeared' on elements
            this.items.forEach(item => {
                item.classList.remove(this.classIsAppeared);
            });
            
            // Observe items
            let observerCallback = entries => {
                entries.forEach(entry => {
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
                });
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
