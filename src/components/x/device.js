//
//	device.js
//	x
//
//	Created by Andrey Shpigunov on 11.09.2024.
//
//  Device, OS and browser detection
//
//  All variables, if matched, return true:
//  device.[
//    ie|firefox|safari|webkit|chrome|opera|
//    windows|macos|linux|ios|
//    ipad|ipod|iphone|android|
//    mobile|desktop|js
//  ]
//
//  Also returns device screen size:
//  device.width
//  device.height
//


export const device = (function () {
    
    let html = document.documentElement,
        userAgent = window.navigator.userAgent.toLowerCase(),
        classes = [];
    
    let fields = {
        js: true,
        os: null,
        browser: null,
        device: null,
        mobile: false,
        touch: false,
        width: window.innerWidth,
        height: window.innerHeight
    }
    
    // Save current <html> tag classes
    let classAttr = html.className;
    if (classAttr !== '') classes = classAttr.split(/\s+/);
    
    // Add class 'js'
    classes.push('js');
    
    // Detect OS
    if (/win/.test(userAgent)) {
        fields.os = 'windows';
    } else if (/linux/.test(userAgent)) {
        fields.os = 'linux';
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
        fields.os = 'ios';
    } else if (/mac/.test(userAgent)) {
        fields.os = 'macos';
    }
    classes.push(fields.os);
    
    // Detect browser classes
    if (
        /mozilla/.test(userAgent) &&
        !/(compatible|webkit)/.test(userAgent)
    ) {
        fields.browser = 'firefox';
    } else if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) {
        classes.push('webkit');
        fields.browser = 'safari';
        let versionMatch = userAgent.match(/version\/([0-9.]+)/);
        if (versionMatch) classes.push('safari' + parseInt(versionMatch[1], 10));
    } else if (/chrome/.test(userAgent)) {
        classes.push('webkit');
        fields.browser = 'chrome';
    } else if (/opera/.test(userAgent)) {
        fields.browser = 'opera';
    }
    classes.push(fields.browser);
    
    // Detect device
    if (/ipad/.test(userAgent)) {
        fields.device = 'ipad';
    } else if (/iphone/.test(userAgent)) {
        fields.device = 'iphone';
    } else if (/android/.test(userAgent)) {
        fields.device = 'android';
    } else if (/mac/.test(userAgent)) {
        fields.device = 'mac';
    }
    classes.push(fields.device);
    
    // Detect device type classes
    if (/mobile/.test(userAgent)) {
        classes.push('mobile');
        fields.mobile = true;
    } else {
        classes.push('desktop');
    }
    
    // Detect touch device
    if (matchMedia('(pointer: coarse)').matches) {
        classes.push('touch');
        fields.touch = true;
    }
    
    // Set classes to <html> element
    html.className = classes.join(' ');
    
    return fields;
})();
