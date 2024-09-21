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


export function device() {
    
    let html = document.documentElement,
        userAgent = window.navigator.userAgent.toLowerCase(),
        classes = [];
        
    // Save current <html> tag classes
    let classAttr = html.className;
    if (classAttr !== '') classes = classAttr.split(/\s+/);
    
    // Add js/no-js class
    classes.push('js');
    
    // Detect browser classes
    let versionMatch;
    if (
        (/msie/.test(userAgent) || /trident/.test(userAgent)) &&
        !/opera/.test(userAgent)
    ) {
        classes.push('ie');
        versionMatch = userAgent.match(/msie ([0-9.]+)/);
        if (versionMatch) {
            let version = parseInt(versionMatch[1], 10);
            classes.push('ie' + version);
            if (version === 7 || version === 8) classes.push('ie7-8');
        }
    } else if (
        /mozilla/.test(userAgent) &&
        !/(compatible|webkit)/.test(userAgent)
    ) {
        classes.push('firefox');
    } else if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) {
        classes.push('safari', 'webkit');
        versionMatch = userAgent.match(/version\/([0-9.]+)/);
        if (versionMatch) classes.push('safari' + parseInt(versionMatch[1], 10));
    } else if (/chrome/.test(userAgent)) {
        classes.push('chrome', 'webkit');
    } else if (/opera/.test(userAgent)) {
        classes.push('opera');
    }
    
    // Detect OS classes
    if (/win/.test(userAgent)) {
        classes.push('windows');
    } else if (/mac/.test(userAgent)) {
        classes.push('macos');
    } else if (/linux/.test(userAgent)) {
        classes.push('linux');
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
        classes.push('ios');
    }
    
    // Detect device type classes
    if (/mobile/.test(userAgent)) {
        classes.push('mobile');
    } else {
        classes.push('desktop');
    }
    
    // Detect mobile device classes
    if (/ipad/.test(userAgent)) {
        classes.push('ipad');
    } else if (/ipod/.test(userAgent)) {
        classes.push('ipod');
    } else if (/iphone/.test(userAgent)) {
        classes.push('iphone');
    } else if (/android/.test(userAgent)) {
        classes.push('android');
    }
    
    // Set classes
    html.className = classes.join(' ');
    
    // Create object with classes keys
    let classesHash = {};
    
    for (let i = 0, len = classes.length; i < len; i++) {
        classesHash[classes[i]] = true;
    }
    
    classesHash.width = window.innerWidth;
    classesHash.height = window.innerHeight;
    return classesHash;
}
