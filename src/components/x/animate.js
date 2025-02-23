//
//  animate.js
//  x | Animations
//  Created by Andrey Shpigunov at 20.01.2025
//  All right reserved.
//
//
//  On scroll animations
//
//  <div x-animate='{
//    "parent": "#id or .class selector", — default "window"
//    "trigger": "selector (default — this)",
//    "start": "120vh",
//    "end": "0vh",
//    "functionName": "coverOut",
//    "class": "fixed",
//    "classRemove": true
//  }'>...</div>
//
//  trigger       selector of trigger element that we are tracking the position
//  start         animation start point (height from the top in px, % or vh)
//  end           animation end point (height from the top in px, % or vh)
//  functionName  name of the function that starts executing when the element
//                moves between "start" and "end"
//  class         class, added to a reference when "target" is between "start" and "end"
//  classRemove   whether to delete the "class" from the element after it leaves
//                the animation zone, by default false
//
//  init() - init animations
//


import { lib } from './lib';


class Animate {

  init() {
    let animations = lib.qsa('[x-animate]');
    if (animations.length) {
      let animationsHash = {};

      animations.forEach((e, index) => {
        let json = JSON.parse(e.getAttribute('x-animate'));
        let item = {};
        if (json.hasOwnProperty('parent') && lib.qs(json.parent)) {
          item.parent = lib.qs(json.parent)
        } else {
          item.parent = window
        }
        if (json.hasOwnProperty('trigger') && lib.qs(json.trigger)) {
          item.trigger = lib.qs(json.trigger)
        } else {
          item.trigger = e
        }
        item.element = e;
        item.start = json.start;
        item.end = json.end;
        item.class = json.class;
        item.classRemove = json.classRemove;
        item.functionName = json.functionName;
        item.locked = false;
        animationsHash[index] = item;
        e.removeAttribute('x-animate')
      });
      
      if (Object.keys(animationsHash).length) {
        // Init document scroll observer
        document.addEventListener('scroll', () => {
          this._scroll(animationsHash);
        }, { passive: true });
        // Create array with scrolled parents
        let parents = [];
        for (let k in animationsHash) {
          if (
            Object.hasOwn(animationsHash[k], 'parent') &&
            !parents.includes(animationsHash[k].parent)
          ) {
            parents.push(animationsHash[k].parent)
            animationsHash[k].parent.addEventListener('scroll', () => {
              this._scroll(animationsHash);
            }, { passive: true });
          }
        };
        // Add scroll event to scrolled parents
        // for (let p in parents) {
        //   let el = lib.qs(parents[p]);
        //   el.addEventListener('scroll', () => {
        //     this._scroll(animationsHash);
        //   }, { passive: true });
        // }
        // First init elements positions
        document.addEventListener('DOMContentLoaded', () => {
          this._scroll(animationsHash)
        })
      }
      
      // if (Object.keys(animationsHash).length) {
      //   document.addEventListener('scroll', () => {
      //     this._scroll(animationsHash);
      //   }, { passive: true });
      //   // If element in scrollarea <div x-animate-scrollarea>
      //   let animateScrollarea = lib.qsa('[x-animate-scrollarea]');
      //   if (animateScrollarea.length) {
      //     animateScrollarea.forEach(item => {
      //       item.addEventListener('scroll', () => {
      //         this._scroll(animationsHash)
      //       }, { passive: true })
      //     })
      //   }
      //   // First init elements positions
      //   document.addEventListener('DOMContentLoaded', () => {
      //     this._scroll(animationsHash)
      //   })
      // }
    }
  }

  _scroll(animationsHash) {
    Object.keys(animationsHash).forEach(i => {
      let item = animationsHash[i],
        top = item.trigger.getBoundingClientRect().top,
        start = this._2px(item.start),
        end = this._2px(item.end);

      item.duration = start - end;
      
      if (item.parent !== window) {
        top = top - item.parent.getBoundingClientRect().top;
      }

      if (top <= start && top >= end) {
        // Element inside of animation area --- > E < ---
        // Unlock function if locked
        item.locked = false;
        // Add active class
        if (item.class != null) {
          item.element.classList.add(item.class);
        }
        // Animation progress
        if (typeof window[item.functionName] === 'function') {
          item.progress = (start - top) / item.duration;
          item.progress = item.progress.toFixed(4);
          window[item.functionName](item)

        }
      } else {
        // Element outside of animation area --- E --- > ... < --- E ---
        // Remove active class
        if (
          item.class != null &&
          item.classRemove == true &&
          item.element.classList.contains(item.class)
        ) {
          item.element.classList.remove(item.class);
        }

        // Animation progress
        if (!item.locked && typeof window[item.functionName] === 'function') {
          if (top >= start) {
            item.progress = 0;
            window[item.functionName](item);
            item.locked = true;
          }
          if (top <= end) {
            item.progress = 1;
            window[item.functionName](item);
            item.locked = true;
          }
        }
      }
    })
  }

  _2px(value) {
    if (/(%|vh)/.test(value)) {
      let html = lib.qs('html');
      let body = lib.qs('body');
      // Get offset
      // let x = window.innerWidth || html.clientWidth || body.clientWidth;
      let y = window.innerHeight || html.clientHeight || body.clientHeight;
      // Remove 'vh' and '%' from value
      value = value.replace(/(vh|%)/, '');
      return (y * parseFloat(value)) / 100
    } else {
      // Remove all chars from value
      return parseFloat(value)
    }
  }

}

export const animate = new Animate();
