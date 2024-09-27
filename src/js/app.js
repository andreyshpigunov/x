//
//	app.js
//	auto-x
//
//	Created by Andrey Shpigunov on 03.09.2024.
//


import './x.js';
import Alpine from 'alpinejs'
 
 
window.Alpine = Alpine;
Alpine.start();

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
    let _height = x.device.width <= 639 ? 100 : 120;
    let header = qs('.header');
    let headerLogo = qs('.header-logo img');
    let height = _height - params.progress * _height / 2;
    let scale = 1 - params.progress * 0.5;
    header.style.height = height + 'px';
    headerLogo.style.transform = 'scale(' + scale +  ')';
    x.lib.switchClass(header, params.progress == 1, 'header_compact');
}

