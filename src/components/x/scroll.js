//
//	scroll.js
//	auto-x
//
//	Created by Andrey Shpigunov on 04.09.2024.
//
//
//  Scroll page to element id.
//  Automatically works on element with data-scroll:
//  <div id="top">...</div>
//  <a data-scrollto="top">Up</a>
//  or
//  <a data-scrollto='
//    {
//      "parent": "#id or .class selector", — default "window"
//      "target": "top",
//      "duration": 400,
//      "offset": 0,
//      "classActive": "active",
//      "hash": false
//    }
//  '>Up</a>
//
//  API call:
//  this.scrollTo() — old method
//
//  For simple scroll:
//  this.to('element id, selector or element item')
//  or
//  this.to(element)
//
//  With params:
//  this.to({
//    parent: "element selector", — default value = window
//    target: "element id, selector or element item",
//    duration: 400, — scroll duration in ms
//    offset: 0, — offset top in px
//    classActive: 'active',
//    hash: false
//  })
//
//  scrollTo support async methods:
//  auto.scroll.to(element).then((e) => { alert('Here!') })


class Scroll {
    
    constructor() {
        this.parent = window;
        this.duration = 400;
        this.offset = 0;
        this.classActive = 'active';
        this.hash = false;
        // Link to new method
        this.to = this.scrollTo;
    }
    
    init() {
        let links = document.querySelectorAll('[data-scrollto]');
        
        if (links.length) {
            let linksHash = {};
            
            links.forEach((e, index) => {
                try {
                    let item = {};
                    
                    if (this._isValidJSON(e.dataset.scrollto)) {
                        let json = JSON.parse(e.dataset.scrollto);
                        if (
                            json.hasOwnProperty('target') && this._getElement(json.target)
                        ) {
                            item.link = e;
                            item.parent = json.parent || this.parent;
                            item.target = this._getElement(json.target);
                            item.duration = json.duration || this.duration;
                            item.offset = json.offset || this.offset;
                            item.classActive = json.classActive || this.classActive;
                            item.hash = json.hash || this.hash;
                        } else {
                            console.error(
                                'Target required in JSON ' + json + ' or element not exist'
                            );
                        }
                    } else {
                        if (
                            this._getElement(e.dataset.scrollto)
                        ) {
                            item.link = e;
                            item.parent = this.parent;
                            item.target = this._getElement(e.dataset.scrollto);
                            item.duration = this.duration;
                            item.offset = this.offset;
                            item.classActive = this.classActive;
                            item.hash = this.hash;
                        } else {
                            console.error(
                                'Target "' + e.dataset.scrollto + '" not found.'
                            );
                        }
                    }
                    
                    if (item) {
                        linksHash[index] = item;
                        e.removeAttribute('data-scrollto');
                        e.addEventListener('click', event => {
                            event.preventDefault();
                            this.scrollTo({
                                parent: item.parent,
                                target: item.target,
                                duration: item.duration,
                                offset: item.offset,
                                classActive: item.classActive,
                                hash: item.hash
                            });
                        });
                    }
                } catch (err) {
                    console.error(err);
                }
            });
            
            if (Object.keys(linksHash).length) {
                this._scrollObserve(linksHash);
                
                let parents = [];
                for (let k in linksHash) {
                    if (
                        Object.hasOwn(linksHash[k], 'parent') &&
                        !parents.includes(linksHash[k].parent)
                    ) {
                        parents.push(linksHash[k].parent)
                    }
                };
                
                for (let p in parents) {
                    let el = this._getElement(parents[p]);
                    el.addEventListener('scroll', () => {
                        this._scrollObserve(linksHash);
                    }, { passive: true });
                }
            }
        }
    }
    
    scrollTo(params) {
    // params — string (id, selector) or element node
    // or object with fields:
    // {
    //     parent: "element selector", — default value = window
    //     target: "element id, selector or element item",
    //     duration: 400, — scroll duration in ms
    //     offset: 0, — offset top in px
    //     classActive: 'active',
    //     hash: false
    //  }
        return new Promise(resolve => {
            let parent = this._getElement(params.parent) || this.parent,
                target,
                duration = params.duration || this.duration,
                offset = params.offset || this.offset,
                hash = params.hash || this.hash;
            
            if (typeof params === 'object') {
                target = this._getElement(params.target);
            } else {
                target = this._getElement(params);
            }
            if (!target) {
                console.error('Target ' + target + ' not found');
                return;
            }
            
            let elementY,
                startingY,
                // targetY,
                parentY,
                diff;
            
            if (parent == window) {
                // Page scroll offset value
                startingY = parent.pageYOffset;
                // Distance to target element, from page top
                elementY = parent.pageYOffset + target.getBoundingClientRect().top;
                diff = elementY - startingY - offset;
            } else {
                // Code for not window object (scrollable div and others)
                startingY = parent.scrollTop;
                parentY = parent.getBoundingClientRect().top;
                elementY = parent.scrollTop + target.getBoundingClientRect().top - parentY;
                diff = elementY - startingY - offset;
            }
            
            let easeInOutCubic = t => {
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            };
            let easeOutCubic = t => {
                return 1 - Math.pow(1 - t, 3);
            };
            let easeOutQuint = t => {
                return 1 - Math.pow(1 - x, 5);
            };
            
            let start;
            if (!diff) return;
            
            window.requestAnimationFrame(function step(timestamp) {
                if (!start) start = timestamp;
                let time = timestamp - start;
                // Scroll progress (0..1)
                let progress = duration > 0 ? Math.min(time / duration, 1) : 1;
                progress = easeOutQuint(progress);
                parent.scrollTo(0, startingY + diff * progress);
                if (time < duration) {
                    window.requestAnimationFrame(step);
                } else {
                    if (hash && target.id) {
                        window.location.hash = target.id;
                    } else if (hash) {
                        history.replaceState({}, document.title, window.location.href.split('#')[0]);
                    }
                    resolve();
                }
            })
        })
    }
    
    _scrollObserve(linksHash) {
        Object.keys(linksHash).forEach(i => {
            let item = linksHash[i],
                targetOffset = item.target.getBoundingClientRect();
                // duration = item.duration,
                // offset = item.offset;
                
            if (
                targetOffset.top <= document.documentElement.clientHeight / 2 &&
                targetOffset.bottom > document.documentElement.clientHeight / 2
            ) {
                if (item.classActive != null) {
                    item.link.classList.add(item.classActive);
                    item.target.classList.add(item.classActive);
                }
            } else {
                if (
                    item.classActive != null &&
                    item.link.classList.contains(item.classActive)
                ) {
                    item.link.classList.remove(item.classActive);
                    item.target.classList.remove(item.classActive);
                }
            }
        });
    }
    
    _isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (err) {
            return false;
        }
    }
    
    _getElement(element) {
        if (element instanceof Window) {
            return element;
        } else if (element && element.nodeType === Node.ELEMENT_NODE) {
            return element;
        } else if (document.getElementById(element)) {
            return document.getElementById(element);
        } else if (document.querySelector(element)) {
            return document.querySelector(element);
        } else {
            console.error('Element ' + element + ' not found');
        }
    }
}

export const scroll = new Scroll();
