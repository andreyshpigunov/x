//
//  loadmore.js
//  x |
//  Created by Andrey Shpigunov at 11.02.2025
//  All right reserved.
//
//
//  Load callback when element appeared in viewport from bottom.
//
//  <div x-loadmore='{"functionName": "load"}'>...</div>
//  Callback function has paramenter "page":
//  function load(page) { ... }
//


import { lib } from './lib';


class Loadmore {

  constructor() {
    // Items with 'x-loadmore'
    this.items = {};
    // Lock repeat events, when current event in progress
    this.locked = false;
  }

  init() {
    const blocks = lib.qsa('[x-loadmore]');
    if (blocks.length) {
      const callback = async (entries, observer) => {
        for (let entry of entries) {
          if (entry.isIntersecting && !this.locked) {
            this.locked = true;
            if (lib.isValidJSON(entry.target.getAttribute('x-loadmore'))) {
              let json = JSON.parse(entry.target.getAttribute('x-loadmore'));
              if (json.hasOwnProperty('functionName')) {
                let state = await window[json.functionName](this.items[entry.target.id].page);
                if (state) {
                  this.items[entry.target.id].page++;
                } else {
                  observer.unobserve(entry.target);
                }
              } else {
                console.log('functionName required in JSON ' + json);
              }
            } else {
              console.error('Invalid JSON in x-loadmore');
            }
            this.locked = false;
          }
        }
      }
      const options = {
        rootMargin: '0px 0px 400px 0px',
        threshold: 0
      }
      const observer = new IntersectionObserver(callback, options);
      for (let block of blocks) {
        let id = lib.makeId();
        block.setAttribute('id', id);
        this.items[id] = {
          el: block,
          page: 1
        }
        observer.observe(block);
      }
    }
  }
}

export const loadmore = new Loadmore();
