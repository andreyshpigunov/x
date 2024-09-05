//
//	app.js
//	auto-x
//
//	Created by Andrey Shpigunov on 03.09.2024.
//


import { x } from './x.js';

x.init();

// Animation global functions
window.element1 = (params) => {
    let rotate = params.progress * -360;
    params.element.style.transform = 'rotate(' + rotate +  'deg)';
}
window.element2 = (params) => {
    let rotate = params.progress * 180;
    params.element.style.transform = 'rotate(' + rotate +  'deg)';
}
window.element3 = (params) => {
    let rotate = params.progress * 120;
    params.element.style.transform = 'rotate(' + rotate +  'deg)';
}
window.headerAnimation = (params) => {
    let header = qs('.header');
    let headerLogo = qs('.header-logo img');
    let height = 120 - params.progress * 60;
    let scale = 1 - params.progress * 0.5;
    header.style.height = height + 'px';
    headerLogo.style.transform = 'scale(' + scale +  ')';
    x.lib.switchClass(header, params.progress == 1, 'header_compact');
}
