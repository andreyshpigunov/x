//
//	lazyload.js
//	auto-x
//
//	Created by Andrey Shpigunov on 03.09.2024.
//
//
//  Loading images when they appearing in viewport.
//  If IntersectionObserver is not supported, triggered fallback.
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
            const images = lib.qsa('.lazyload:not(.loaded)');
            if (images) {
                const observer = new IntersectionObserver(
                    (entries, observer) => {
                        if (entries) {
                            entries.forEach(entry => {
                                if (entry.intersectionRatio > 0) {
                                    this._loadImage(entry.target);
                                    observer.unobserve(entry.target);
                                }
                            });
                        }
                    },
                    this.options
                );
                images.forEach(img => {
                    observer.observe(img);
                });
            }
        } else {
            this._fallback();
        }
    }
    
    _fallback() {
        const images = lib.qsa('.lazyload:not(.loaded)');
        if (images) {
            images.forEach((img) => {
                const srcset = img.dataset.srcset;
                const src = img.dataset.src;
                if (srcset) img.srcset = srcset;
                if (src) img.src = src;
                img.classList.add('loaded');
            });
        }
    }
    
    _fetchImage(src, srcset) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            if (srcset) image.srcset = srcset;
            if (src) image.src = src;
            image.onload = resolve;
            image.onerror = reject;
        });
    }

    _loadImage(img) {
        const srcset = img.dataset.srcset;
        const src = img.dataset.src;
        this._fetchImage(src, srcset)
            .then(() => {
                if (srcset) {
                    img.srcset = srcset;
                    img.removeAttribute('data-srcset');
                }
                if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                }
                if (srcset || src) {
                    img.classList.add('loaded');
                }
            })
            .catch(() => {
                return false;
            });
    }
}

export const lazyload = new Lazyload();
