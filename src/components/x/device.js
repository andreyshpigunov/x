//
//  device.js / x
//  Device detection utility
//
//  Created by Andrey Shpigunov at 12.04.2025
//  All rights reserved.
//
//  This module detects basic device, OS, browser, screen size,
//  input capabilities, and sets corresponding CSS classes on <html>.
//  Also provides basic responsive size flags.
//
//  Exported object includes:
//    - js: true (always present)
//    - os: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown'
//    - browser: 'chrome' | 'firefox' | 'safari' | 'opera' | 'unknown'
//    - device: 'iphone' | 'ipad' | 'android' | 'mac' | undefined
//    - mobile: boolean
//    - touch: boolean
//    - width: window width
//    - height: window height
//    - size: { s: boolean, m: boolean, l: boolean, xl: boolean }
//
//  Available methods:
//    - (internal) debounce(func, delay)
//    - (internal) size() → returns responsive size flags
//

export const device = (function () {

  /**
   * Creates a debounced version of a function.
   * Useful for reducing frequency of resize events.
   *
   * @param {Function} func - Function to debounce.
   * @param {number} delay - Delay in milliseconds.
   * @returns {Function}
   */
  const debounce = (func, delay) => {
    let timeout;
    return function () {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, arguments), delay);
    };
  };

  /**
   * Returns an object of responsive size flags based on window width.
   * @returns {{s: boolean, m: boolean, l: boolean, xl: boolean}}
   */
  function size() {
    const width = window.innerWidth;
    return {
      s: width < 600,
      m: width >= 600 && width < 1000,
      l: width >= 1000,
      xl: width >= 1400
    };
  }

  // Reference to <html> element
  const html = document.documentElement;

  // Normalize user agent string
  const userAgent = window.navigator.userAgent.toLowerCase();

  // CSS classes to apply to <html>
  const classes = [];

  // Main exported object that holds all detected fields
  const fields = {
    js: true,
    os: null,
    browser: null,
    device: null,
    mobile: /mobile/.test(userAgent),
    touch: false,
    width: window.innerWidth,
    height: window.innerHeight,
    size: size()
  };

  /**
   * Adds a class to the list if not already present.
   * @param {string} className
   */
  const addClass = (className) => {
    if (className && !classes.includes(className)) {
      classes.push(className);
    }
  };

  // Detect OS from user agent
  const osMapping = {
    win: 'windows',
    linux: 'linux',
    iphone: 'ios',
    ipad: 'ios',
    ipod: 'ios',
    mac: 'macos',
    android: 'android'
  };

  fields.os = Object.keys(osMapping).find(key => userAgent.includes(key)) || 'unknown';

  // Detect browser from user agent
  const browserMapping = {
    firefox: /mozilla/.test(userAgent) && !/(compatible|webkit)/.test(userAgent),
    safari: /safari/.test(userAgent) && !/chrome/.test(userAgent),
    chrome: /chrome/.test(userAgent),
    opera: /opera/.test(userAgent)
  };

  fields.browser = Object.keys(browserMapping).find(browser => browserMapping[browser]) || 'unknown';

  // Detect device type from user agent
  if (/ipad/.test(userAgent)) {
    fields.device = 'ipad';
  } else if (/iphone/.test(userAgent)) {
    fields.device = 'iphone';
  } else if (/android/.test(userAgent)) {
    fields.device = 'android';
  } else if (/mac/.test(userAgent)) {
    fields.device = 'mac';
  }

  // Add detected classes
  addClass('js');
  addClass(fields.os);
  addClass(fields.browser);
  addClass(fields.device);
  addClass(fields.mobile ? 'mobile' : 'desktop');

  // Detect touch support using media query
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    fields.touch = true;
    addClass('touch');
  }

  /**
   * Updates screen width/height and responsive size flags.
   * Called on window resize.
   */
  const updateDimensions = () => {
    fields.width = window.innerWidth;
    fields.height = window.innerHeight;
    fields.size = size();
  };

  // Debounced resize listener to update screen dimensions
  window.addEventListener('resize', debounce(updateDimensions, 100));

  // Apply all collected classes to <html>
  classes.forEach(c => html.classList.add(c));

  // Return the fields object as a singleton export
  return fields;

})();
