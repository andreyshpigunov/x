/**
 * @fileoverview Device detection utility
 *
 * Detects the device type, operating system, browser, screen size, and touch capability.
 * Automatically sets CSS classes on the <html> element for styling purposes.
 * Also provides a singleton object with current device parameters.
 *
 * Exported singleton: `device`
 *
 * Public API (exported fields):
 *
 * - `device.js`        – Always `true`. Indicates that JS is enabled.
 * - `device.os`        – Detected OS: `'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown'`
 * - `device.browser`   – Detected browser: `'chrome' | 'firefox' | 'safari' | 'opera' | 'unknown'`
 * - `device.device`    – Device type: `'iphone' | 'ipad' | 'android' | 'mac' | null`
 * - `device.mobile`    – `true` if the device is mobile.
 * - `device.touch`     – `true` if the device supports touch input.
 * - `device.width`     – Current window width in pixels.
 * - `device.height`    – Current window height in pixels.
 * - `device.size`      – Responsive size flags:
 *     - `xs` – width < 400px
 *     - `s`  – width < 600px
 *     - `m`  – 600px <= width < 1000px
 *     - `l`  – width >= 1000px
 *     - `xl` – width >= 1400px
 *
 * Example usage:
 *
 *   import { device } from './device.js';
 *
 *   if (device.mobile) {
 *     console.log('Mobile device detected');
 *   }
 *
 *   console.log('Current size:', device.size);
 *
 * @author Andrey Shpigunov
 * @version 0.2
 * @since 2025-07-17
 */

 import { lib } from './lib';
 
/**
 * Device detection singleton.
 *
 * Provides a set of properties describing the current device, browser, OS, screen size, and input capabilities.
 * Automatically applies corresponding CSS classes to the <html> element.
 *
 * @type {{
 *   js: boolean,
 *   os: string,
 *   browser: string,
 *   device: (string|null),
 *   mobile: boolean,
 *   touch: boolean,
 *   width: number,
 *   height: number,
 *   size: {xs: boolean, s: boolean, m: boolean, l: boolean, xl: boolean}
 * }}
 */
export const device = (function () {

  /**
   * Calculates responsive size flags based on the current window width.
   *
   * @returns {{xs: boolean, s: boolean, m: boolean, l: boolean, xl: boolean}}
   * An object representing the current responsive size.
   * @private
   */
  const _size = () => {
    const width = window.innerWidth;
    return {
      xs: width < 400,
      s:  width < 600,
      m:  width >= 600 && width < 1000,
      l:  width >= 1000,
      xl: width >= 1400
    }
  };

  /**
   * Adds a CSS class to the list if it is not already present.
   *
   * @param {string} className - The CSS class to add.
   * @private
   */
  const _addClass = (className) => {
    if (className && !classes.includes(className)) {
      classes.push(className);
    }
  };

  /**
   * Updates the `width`, `height`, and `size` properties of the `device` singleton.
   * Called on window resize events (debounced).
   *
   * @private
   */
  const _updateDimensions = () => {
    fields.width = window.innerWidth;
    fields.height = window.innerHeight;
    fields.size = _size();
  };

  // Reference to <html> element
  const html = document.documentElement;

  // Normalize user agent string
  const userAgent = window.navigator.userAgent.toLowerCase();

  // CSS classes to apply to <html>
  const classes = [];

  // Exported fields with device info
  const fields = {
    js: true,
    os: null,
    browser: null,
    device: null,
    mobile: /mobile/.test(userAgent),
    touch: false,
    width: window.innerWidth,
    height: window.innerHeight,
    size: _size()
  };

  // Detect OS
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

  // Detect browser
  const browserMapping = {
    firefox: /mozilla/.test(userAgent) && !/(compatible|webkit)/.test(userAgent),
    safari: /safari/.test(userAgent) && !/chrome/.test(userAgent),
    chrome: /chrome/.test(userAgent),
    opera: /opera/.test(userAgent)
  };

  fields.browser = Object.keys(browserMapping).find(browser => browserMapping[browser]) || 'unknown';

  // Detect device type
  if (/ipad/.test(userAgent)) {
    fields.device = 'ipad';
  } else if (/iphone/.test(userAgent)) {
    fields.device = 'iphone';
  } else if (/android/.test(userAgent)) {
    fields.device = 'android';
  } else if (/mac/.test(userAgent)) {
    fields.device = 'mac';
  }

  // Add detected classes to <html>
  _addClass('js');
  _addClass(fields.os);
  _addClass(fields.browser);
  _addClass(fields.device);
  _addClass(fields.mobile ? 'mobile' : 'desktop');

  // Detect touch support using media query
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    fields.touch = true;
    _addClass('touch');
  }

  // Listen to resize events and update dimensions
  window.addEventListener('resize', lib.debounce(_updateDimensions, 100));

  // Apply all collected classes to <html>
  classes.forEach(cl => html.classList.add(cl));

  // Return the fields object as a singleton export
  return fields;

})();
