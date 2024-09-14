//
//	hover.js
//	x
//
//	Created by Andrey Shpigunov on 11.09.2024.
//
// hover() - sync .hover class on elements with class '.syncHover' and same href
//


import { lib } from './lib';


// Sync .hover class on elements with class '.syncHover' and same href
export function hover() {
    let hovers = lib.qsa('.syncHover');
    if (hovers.length) {
        hovers.forEach(item => {
            // Add listeners for all synced elements
            _listener('mouseover', item);
            _listener('mouseout', item);
        });
    }
}

function _listener(event, elem) {
    elem.addEventListener(event, () => {
        let items = lib.qsa('[href="' + elem.getAttribute("href") + '"]');
        if (items.length) {
            items.forEach((item) => {
                // Add .hover class on mouser over
                // Remove .hover class on mouse out
                if (event === 'mouseover') {
                    lib.addClass(item, 'hover')
                } else {
                    lib.removeClass(item, 'hover')
                }
            });
        }
    });
}
