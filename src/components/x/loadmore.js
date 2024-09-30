//
//	loadmore.js
//	x
//
//	Created by Andrey Shpigunov on 19.09.2024.
//
//  Appeared element callback
//  Load callback when element appeared in viewport from bottom.
//
//  <div x-loadmore='{"functionName": "load", "offset": "100"}'>...</div>
//  Callback function has paramenter "page":
//  function load(page) { ... }
//
//  Stop watching:
//  loadmore.unwatch()
//


// TODO Check and update code with IntersectionObserver like in lazyload.


import { lib } from './lib';


class Loadmore {
    
    constructor() {
        this.page = 1;
        this.offset = 0;
        this.watch = true;
        this.blocksHash = {};
    }

    init() {
        let item;
        let blocks = lib.qsa('[x-loadmore]');
        if (blocks.length) {
            blocks.forEach((e, index) => {
                if (lib.isValidJSON(e.getAttribute('x-loadmore'))) {
                    let json = JSON.parse(e.getAttribute('x-loadmore'));
                    
                    if (json.hasOwnProperty('functionName')) {
                        item = {};
                        item.block = e;
                        item.offset = json.offset || this.offset;
                        item.functionName = json.functionName;
                    } else {
                        console.log('functionName required in JSON ' + json);
                    }
                } else {
                    console.log('Invalid JSON in x-loadmore');
                }
                
                if (item) {
                    let name = e.hasAttribute('id') ? e.getAttribute('id') : index;
                    this.blocksHash[name] = item;
                    e.removeAttribute('x-loadmore');
                }
            });
            
            if (Object.keys(this.blocksHash).length) {
                this._scrollObserve(this.blocksHash);
                document.addEventListener('scroll', () => {
                    this._scrollObserve(this.blocksHash);
                }, { passive: true });
            }
        }
    }
    
    _scrollObserve(blocksHash) {
        Object.keys(blocksHash).forEach(i => {
            let item = blocksHash[i];
            let scrollPosition = parseInt(
                window.scrollY + document.documentElement.clientHeight
            );
            let scrollTarget = parseInt(
                item.block.offsetTop + item.block.clientHeight - item.offset
            );
            
            if (scrollPosition >= scrollTarget) {
                if (this.watch) {
                    if (typeof window[item.functionName] === 'function') {
                        window[item.functionName](this.page);
                        this.page++;
                    }
                    this.watch = false;
                }
            } else {
                this.watch = true;
            }
        });
    }
    
    unwatch(id) {
        delete this.blocksHash[id];
    }
}

export const loadmore = new Loadmore();
