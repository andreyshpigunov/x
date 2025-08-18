/**
 * @fileoverview
 * Device detection and breakpoint observer.
 *
 * Detects device type, OS, browser, screen size, and touch capability.
 * Automatically applies CSS classes to the <html> element.
 * Adds a custom `breakpointchange` event on `window` when the responsive
 * breakpoint changes (e.g. s → m, m → l, etc).
 * Supports safe repeated initialization without leaks.
 *
 * Usage example:
 *
 *   import { Device } from './device.js';
 *
 *   const device = new Device();
 *   device.init();
 *
 *   // Listen for breakpoint changes
 *   window.addEventListener('breakpointchange', e => {
 *     console.log('Breakpoint changed:', e.detail);
 *   });
 *
 * Public API:
 *
 * @class Device
 *
 * @property {boolean} js - Always true, indicates JS is enabled
 * @property {string} os - Operating system (windows, macos, ios, android, linux, unknown)
 * @property {string} browser - Browser name (chrome, firefox, safari, opera, edge, unknown)
 * @property {string|null} device - Device type (iphone, ipad, android, mac) or 'computer'
 * @property {boolean} mobile - Flag indicating if the device is mobile
 * @property {boolean} touch - Flag indicating if touch support is available
 * @property {number} width - Current window width
 * @property {number} height - Current window height
 * @property {string} breakpoint - Current responsive breakpoint (s, m, l, xl)
 * @property {{s:boolean, m:boolean, l:boolean, xl:boolean}} size - Flags for each breakpoint
 *
 * @method init - Initializes or re-initializes detection, CSS classes, and resize listeners
 *
 * @event window.breakpointchange - Fired when the breakpoint changes
 *   @detail.prev {string} - Previous breakpoint
 *   @detail.current {string} - Current breakpoint
 *   @detail.width {number} - Current window width
 *   @detail.height {number} - Current window height
 *
 * @author Andrey Shpigunov
 * @version 0.7
 * @since 2025-07-18
 */

import { lib } from './lib';

export class Device {
  constructor() {
    // Basic feature flags
    this.js = true;
    this.os = 'unknown';
    this.browser = 'unknown';
    this.device = null;
    this.mobile = false;
    this.touch = false;

    // Current viewport dimensions
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Initial breakpoint state
    this.breakpoint = this._getBreakpointName(this.width);
    this.size = this._getSizeFlags(this.breakpoint);

    // Internal references
    this._html = document.documentElement;

    // Bind and debounce resize handler
    this._onResize = this._onResize.bind(this);
    this._debouncedResize = lib.debounce(this._onResize, 200);

    this._initialized = false;
  }

  /**
   * Initializes or reinitializes the device detection,
   * removes previous listeners and CSS classes if needed,
   * then applies new state and listeners.
   */
  init() {
    if (this._initialized) {
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

  /**
   * Returns a breakpoint name based on current width.
   * Breakpoint map:
   *   - s: < 600px
   *   - m: ≥600px and <1000px
   *   - l: ≥1000px and <1400px
   *   - xl: ≥1400px
   *
   * @param {number} width - Current viewport width
   * @return {'s'|'m'|'l'|'xl'}
   * @private
   */
  _getBreakpointName(width) {
    if (width >= 1400) return 'xl';
    if (width >= 1000) return 'l';
    if (width >= 600) return 'm';
    return 's';
  }

  /**
   * Converts breakpoint string into boolean flags for convenience.
   *
   * @param {'s'|'m'|'l'|'xl'} bp - Breakpoint name
   * @return {{s:boolean,m:boolean,l:boolean,xl:boolean}}
   * @private
   */
  _getSizeFlags(bp) {
    return {
      s: bp === 's',
      m: bp === 'm',
      l: bp === 'l',
      xl: bp === 'xl'
    };
  }

  /**
   * Handles resize events, updates internal state,
   * and dispatches `breakpointchange` if breakpoint changed.
   *
   * @private
   */
  _onResize() {
    const prevBreakpoint = this.breakpoint;

    // Update dimensions
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Calculate new breakpoint
    const newBreakpoint = this._getBreakpointName(this.width);

    // Fire event only if breakpoint changed
    if (prevBreakpoint !== newBreakpoint) {
      this.breakpoint = newBreakpoint;
      this.size = this._getSizeFlags(newBreakpoint);

      const event = new CustomEvent('breakpointchange', {
        detail: {
          prev: prevBreakpoint,
          current: newBreakpoint,
          width: this.width,
          height: this.height
        }
      });
      window.dispatchEvent(event);
    } else {
      // Just refresh size flags (safe update)
      this.breakpoint = newBreakpoint;
      this.size = this._getSizeFlags(newBreakpoint);
    }
  }

  /**
   * Detects operating system, browser, device type, and touch support.
   * @private
   */
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

  /**
   * Applies detected CSS classes to the <html> element.
   * @private
   */
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
