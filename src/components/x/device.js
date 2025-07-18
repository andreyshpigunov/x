/**
 * @fileoverview
 * Device detection class.
 *
 * Detects device type, OS, browser, screen size, and touch capability.
 * Automatically applies CSS classes to the <html> element.
 * Supports safe repeated initialization without leaks.
 *
 * Usage example:
 *
 *   import { Device } from './device.js';
 *
 *   const device = new Device();
 *   device.init();
 *
 *   // Safe to call init() again to reinitialize
 *   device.init();
 *
 * Public API:
 *
 * @class Device
 *
 * @property {boolean} js - Flag indicating JavaScript is enabled (always true)
 * @property {string} os - Operating system (windows, macos, ios, android, linux, unknown)
 * @property {string} browser - Browser name (chrome, firefox, safari, opera, edge, unknown)
 * @property {string|null} device - Device type (iphone, ipad, android, mac) or 'computer'
 * @property {boolean} mobile - Flag indicating if the device is mobile
 * @property {boolean} touch - Flag indicating if touch support is available
 * @property {number} width - Current window width
 * @property {number} height - Current window height
 * @property {{xs:boolean, s:boolean, m:boolean, l:boolean, xl:boolean}} size - Responsive size flags based on window width
 *
 * @method init - Initializes or re-initializes detection, CSS classes, and resize listeners
 *
 * @author Andrey Shpigunov
 * @version 0.6
 * @since 2025-07-18
 */

import { lib } from './lib';

export class Device {
  constructor() {
    this.js = true;
    this.os = 'unknown';
    this.browser = 'unknown';
    this.device = null;
    this.mobile = false;
    this.touch = false;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.size = this._getSizeFlags(this.width);

    this._html = document.documentElement;

    this._onResize = this._onResize.bind(this);
    this._debouncedResize = lib.debounce(this._onResize, 100);

    this._initialized = false;
  }

  /**
   * Initializes or reinitializes the device detection,
   * removes previous listeners and CSS classes if needed,
   * then applies new state and listeners.
   */
  init() {
    if (this._initialized) {
      // Cleanup previous state before reinit
      this._cleanup();
    }

    this._detect();
    this._applyHtmlClasses();

    window.addEventListener('resize', this._debouncedResize);
    this._initialized = true;
  }

  /**
   * Internal cleanup: removes event listeners and clears added classes.
   * @private
   */
  _cleanup() {
    window.removeEventListener('resize', this._debouncedResize);

    // Remove all previously added classes related to device detection
    const classesToRemove = [
      'js',
      'windows', 'macos', 'ios', 'android', 'linux', 'unknown',
      'chrome', 'firefox', 'safari', 'opera', 'edge',
      'iphone', 'ipad', 'android',
      'mobile', 'desktop',
      'touch'
    ];

    classesToRemove.forEach(cls => {
      this._html.classList.remove(cls);
    });

    this._initialized = false;
  }

  _getSizeFlags(width) {
    return {
      xs: width < 400,
      s: width < 600,
      m: width >= 600 && width < 1000,
      l: width >= 1000,
      xl: width >= 1400
    };
  }

  _onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.size = this._getSizeFlags(this.width);
  }

  _detect() {
    const ua = window.navigator.userAgent.toLowerCase();

    this.mobile = /mobile/.test(ua);

    const osMapping = {
      win: 'windows',
      linux: 'linux',
      iphone: 'ios',
      ipad: 'ios',
      ipod: 'ios',
      mac: 'macos',
      android: 'android'
    };
    const osKey = Object.keys(osMapping).find(key => ua.includes(key));
    this.os = osKey ? osMapping[osKey] : 'unknown';

    if (/firefox/.test(ua)) {
      this.browser = 'firefox';
    } else if (/opr\//.test(ua) || /opera/.test(ua)) {
      this.browser = 'opera';
    } else if (/edg\//.test(ua)) {
      this.browser = 'edge';
    } else if (/chrome/.test(ua) && !/edg\//.test(ua) && !/opr\//.test(ua)) {
      this.browser = 'chrome';
    } else if (/safari/.test(ua) && !/chrome/.test(ua) && !/edg\//.test(ua)) {
      this.browser = 'safari';
    } else {
      this.browser = 'unknown';
    }

    if (/ipad/.test(ua)) {
      this.device = 'ipad';
    } else if (/iphone/.test(ua)) {
      this.device = 'iphone';
    } else if (/android/.test(ua)) {
      this.device = 'android';
    } else if (/mac/.test(ua)) {
      this.device = 'mac';
    } else {
      this.device = 'computer';
    }

    this.touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  }

  _applyHtmlClasses() {
    const classes = [
      'js',
      this.os,
      this.browser,
      this.device,
      this.mobile ? 'mobile' : 'desktop',
      this.touch ? 'touch' : null
    ].filter(Boolean);

    classes.forEach(c => this._html.classList.add(c));
  }
}

/**
 * Singleton export of the Device observer.
 * @type {Device}
 */
export const device = new Device();
