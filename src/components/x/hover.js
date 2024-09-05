//
//	hover.js
//	auto-x
//
//	Created by Andrey Shpigunov on 03.09.2024.
//


import { lib } from './lib';


// Sunc .hover class on elements with class '.syncHover' and same href
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
        let items = qsa('[href="' + elem.getAttribute("href") + '"]');
        if (items.length) {
            items.forEach((item) => {
                // Add .hover class on mouser over
                // Remove .hover class on mouse out
                if (event === 'mouseover') {
                    // item.classList.add("hover");
                    lib.addClass(item, 'hover')
                } else {
                    // item.classList.remove("hover");
                    lib.removeClass(item, 'hover')
                }
            });
        }
    });
}
