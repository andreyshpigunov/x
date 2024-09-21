//
//	lazyload.js
//	x
//
//	Created by Andrey Shpigunov on 11.09.2024.
//
//  Loading images when they appearing in viewport.
//  If IntersectionObserver is not supported, triggered fallback.
//
//  init() - initialize layloading
//


import { lib } from './lib';


class Lazyload {
    
    constructor() {
        this.options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.5
        }
    }
    
    init() {
        if ('IntersectionObserver' in window) {
            const images = lib.qsa('[x-lazyload]:not(.loaded)');
            if (images.length) {
                const observer = new IntersectionObserver(
                    (entries, observer) => {
                        if (entries) {
                            for (let entry of entries) {
                                if (entry.intersectionRatio > 0) {
                                    this._loadImage(entry.target);
                                    observer.unobserve(entry.target);
                                }
                            }
                        }
                    },
                    this.options
                );
                for (let img of images) observer.observe(img);
            }
        } else {
            this._fallback();
        }
    }
    
    _fallback() {
        const images = lib.qsa('[x-lazyload]:not(.loaded)');
        if (images.length) {
            for (let img of images) {
                const srcset = img.dataset.srcset;
                const src = img.dataset.src;
                if (srcset) img.srcset = srcset;
                if (src) img.src = src;
                lib.addClass(img, 'loaded');
            }
        }
    }
    
    async _fetchImage(src, srcset) {
        const image = new Image();
        image.srcset = srcset ? srcset : '';
        image.src = src ? src : '';
        image.onload = () => Promise.resolve();
        image.onerror = () => Promise.reject();
    }

    async _loadImage(img) {
        const srcset = img.dataset.srcset;
        const src = img.dataset.src;
        await this._fetchImage(src, srcset);
        if (srcset) {
            img.srcset = srcset;
            img.removeAttribute('data-srcset');
        }
        if (src) {
            img.src = src;
            img.removeAttribute('data-src');
        }
        if (srcset || src) {
            lib.addClass(img, 'loaded');
        }
        return
    }
    
}

export const lazyload = new Lazyload();
