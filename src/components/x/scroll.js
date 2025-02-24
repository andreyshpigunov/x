//
//  scroll.js
//  x | Scroll
//  Created by Andrey Shpigunov at 11.02.2025
//  All right reserved.
//
//
//  Scroll page to element id.
//  Automatically works on element with x-scroll:
//  <div id="top">...</div>
//  <a x-scrollto="top">Up</a>
//  or
//  <a x-scrollto='{
//    "parent": "#id or .class selector", — default "window"
//    "target": "#id or .class selector",
//    "offset": 0,
//    "classActive": "active",
//    "hash": false
//  }'>Up</a>
//
//  API call for simple scroll:
//
//  Simple scroll:
//  this.scrollTo('element id, selector or element item')
//  or
//  this.scrollTo(element)
//
//  With params:
//  this.scrollTo({
//    parent: "element selector", — default value = window
//    target: "element selector or element item",
//    offset: 0, — offset top in px
//    classActive: 'active',
//    hash: false
//  })
//
//  scrollTo support async methods:
//  x.scroll.to(element).then(e => { alert('Here!') })
//


import { lib } from './lib';


class Scroll {

  constructor() {
    this.parent = window;
    this.offset = 0;
    this.classActive = 'active';
    this.hash = false;
    // Shortcut to scrollTo
    this.to = this.scrollTo;
  }

  init() {
    let links = lib.qsa('[x-scrollto]');
    if (links.length) {
      let linksHash = {};
      
      for (let link of links) {
        try {
          let item = {};
          let attr = link.getAttribute('x-scrollto');
          
          if (lib.isValidJSON(attr)) {
            let json = JSON.parse(attr);
            if (
              json.hasOwnProperty('target') && lib.qs(json.target)
            ) {
              item.link = link;
              item.parent = json.parent || this.parent;
              item.target = lib.qs(json.target);
              item.offset = json.offset || this.offset;
              item.classActive = json.classActive || this.classActive;
              item.hash = json.hash || this.hash;
            } else {
              console.error(
                'Target required in JSON ' + JSON.stringify(json) + ' or element not exist'
              );
            }
          } else {
            if (
              lib.qs(attr)
            ) {
              item.link = link;
              item.parent = this.parent;
              item.target = lib.qs(attr);
              item.offset = this.offset;
              item.classActive = this.classActive;
              item.hash = this.hash;
            } else {
              console.error(
                'Target "' + attr + '" not found.'
              );
            }
          }
          
          if (item) {
            linksHash[lib.makeId()] = item;
            link.removeAttribute('x-scrollto');
            link.addEventListener('click', event => {
              event.preventDefault();
              this.scrollTo({
                parent: item.parent,
                target: item.target,
                offset: item.offset,
                classActive: item.classActive,
                hash: item.hash
              });
            });
          }
        } catch (err) {
          console.error(err);
        }
      }
      
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
          let el = lib.qs(parents[p]);
          el.addEventListener('scroll', () => {
            this._scrollObserve(linksHash);
          }, { passive: true });
        }
      }
    }
  }

  async scrollTo(params) {
  // params — string (id, selector) or element node
  // or object with fields:
  // {
  //   parent: "element selector", — default value = window
  //   target: "element id, selector or element item",
  //   offset: 0, — offset top in px
  //   classActive: 'active',
  //   hash: false
  // }
    return new Promise(resolve => {
      let parent = lib.qs(params.parent) || this.parent,
        target,
        offset = params.offset || this.offset,
        hash = params.hash || this.hash;

      if (typeof params === 'object') {
        target = lib.qs(params.target);
      } else {
        target = lib.qs(params);
      }
      if (!target) {
        console.error('Target ' + target + ' not found');
        return;
      }

      let elementY,
        startingY,
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
      
      if (!diff) return;
      
      parent.scrollTo({
        top: startingY + diff,
        left: 0,
        behavior: 'smooth'
      });
      
      if (hash && target.id) {
        lib.updateURL('#' + target.id);
      } else if (hash) {
        history.replaceState({}, document.title, window.location.href.split('#')[0]);
      }
      resolve();
    })
  }

  _scrollObserve(linksHash) {
    Object.keys(linksHash).forEach(i => {
      let item = linksHash[i],
        targetOffset = item.target.getBoundingClientRect();

      if (
        targetOffset.top <= document.documentElement.clientHeight / 6 &&
        targetOffset.bottom > document.documentElement.clientHeight / 6
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
}

export const scroll = new Scroll();
