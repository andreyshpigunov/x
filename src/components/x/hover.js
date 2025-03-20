//
//  hover.js / x
//  Hover sync
//
//  Created by Andrey Shpigunov at 20.03.2025
//  All right reserved.
//
//
// hover() - sync .hover class on elements with 'x-hover' attribute and same href
//


import { lib } from './lib';


// Sync .hover class on elements with class '.syncHover' and same href
export function hover() {
  let hovers = lib.qsa('[x-hover]');
  if (hovers.length) {
    for (let item of hovers) {
      // Add listeners for all synced elements
      _listener('mouseover', item);
      _listener('mouseout', item);
    }
  }
}

function _listener(event, elem) {
  elem.addEventListener(event, () => {
    let items = lib.qsa('[href="' + elem.getAttribute('href') + '"]');
    if (items.length) {
      for (let item of items) {
        // Add .hover class on mouser over
        // Remove .hover class on mouse out
        if (event === 'mouseover') {
          lib.addClass(item, 'hover')
        } else {
          lib.removeClass(item, 'hover')
        }
      }
    }
  });
}
