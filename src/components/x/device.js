/**
 * @fileoverview Device detection and responsive breakpoint observer.
 *
 * Detects device type, OS, browser, screen size, and touch capability.
 * Automatically applies CSS classes to the `<html>` element for styling based on device properties.
 * Dispatches `breakpointchange` event when responsive breakpoint changes (e.g. s → m, m → l, etc).
 * Supports safe repeated initialization without memory leaks.
 *
 * Exported: `Device` class and `device` singleton instance.
 *
 * Usage:
 *
 * Using singleton instance (recommended):
 *   import { device } from './device.js';
 *   device.init();
 *   console.log(device.os);        // 'macos', 'windows', 'ios', etc.
 *   console.log(device.browser);   // 'chrome', 'firefox', 'safari', etc.
 *   console.log(device.breakpoint); // 's', 'm', 'l', 'xl'
 *   console.log(device.size.m);    // true if medium breakpoint
 *
 *   // Listen for breakpoint changes
 *   window.addEventListener('breakpointchange', e => {
 *     console.log('Breakpoint changed:', e.detail);
 *   });
 *
 * Using class instance:
 *   import { Device } from './device.js';
 *   const myDevice = new Device();
 *   myDevice.init();
 *
 * CSS classes automatically added to `<html>`:
 *
 * - `.js` - Always added (indicates JavaScript is enabled)
 * - OS classes: `.windows`, `.macos`, `.ios`, `.android`, `.linux`, `.unknown`
 * - Browser classes: `.chrome`, `.firefox`, `.safari`, `.opera`, `.edge`
 * - Device classes: `.iphone`, `.ipad`, `.android`, `.mac`, `.computer`
 * - `.mobile` or `.desktop` - Based on device type
 * - `.touch` - If touch support is available
 *
 * CSS usage example:
 *   .mobile .menu { display: none; }
 *   .touch button { min-height: 44px; }
 *   .ios input { -webkit-appearance: none; }
 *
 * Breakpoints:
 *
 * - s (small): < 600px (mobile)
 * - m (medium): >= 600px and < 1000px (tablet)
 * - l (large): >= 1000px and < 1400px (desktop)
 * - xl (xlarge): >= 1400px (large desktop)
 *
 * Public API:
 *
 * @class Device
 *
 * @property {boolean} js - Always true, indicates JS is enabled
 * @property {string} os - Operating system: 'windows', 'macos', 'ios', 'android', 'linux', or 'unknown'
 * @property {string} browser - Browser name: 'chrome', 'firefox', 'safari', 'opera', 'edge', or 'unknown'
 * @property {string} device - Device type: 'iphone', 'ipad', 'android', 'mac', or 'computer'
 * @property {boolean} mobile - true if device is mobile
 * @property {boolean} touch - true if touch support is available
 * @property {number} width - Current window width in pixels
 * @property {number} height - Current window height in pixels
 * @property {string} breakpoint - Current responsive breakpoint: 's', 'm', 'l', or 'xl'
 * @property {Object} size - Boolean flags for each breakpoint:
 *   - size.s - true if small breakpoint
 *   - size.m - true if medium breakpoint
 *   - size.l - true if large breakpoint
 *   - size.xl - true if xlarge breakpoint
 *
 * @method init() - Initializes or re-initializes detection, CSS classes, and resize listeners.
 *   Safe to call multiple times. Automatically cleans up previous state.
 * @method destroy() - Removes listeners and CSS classes. Use when unmounting (e.g. Next.js).
 *
 * Next.js: call init() in useEffect() on client; optionally call destroy() in cleanup on route change.
 * SSR-safe: constructor/init/destroy no-op or safe when window is undefined.
 *
 * @event window.breakpointchange - Fired when the responsive breakpoint changes.
 *   Event detail object:
 *   - prev {string} - Previous breakpoint name
 *   - current {string} - Current breakpoint name
 *   - width {number} - Current window width
 *   - height {number} - Current window height
 *
 * @example
 *   // Check if device is mobile
 *   if (device.mobile) {
 *     // Mobile-specific code
 *   }
 *
 *   // Check current breakpoint
 *   if (device.breakpoint === 'xl') {
 *     // Large screen code
 *   }
 *
 *   // Use size flags
 *   if (device.size.m || device.size.l) {
 *     // Medium or large screen
 *   }
 *
 * @example
 * // Next.js — _app.tsx or layout
 * useEffect(() => {
 *   device.init();
 *   return () => device.destroy();
 * }, []);
 *
 * @author Andrey Shpigunov
 * @version 0.7
 * @since 2026-02-02
 */

import { lib } from './lib';

const CLASSES_TO_REMOVE = [
  'js', 'windows', 'macos', 'ios', 'android', 'linux', 'unknown',
  'chrome', 'firefox', 'safari', 'opera', 'edge',
  'iphone', 'ipad', 'mac', 'computer', 'mobile', 'desktop', 'touch'
];

const SIZE_FLAGS = {
  s: { s: true, m: false, l: false, xl: false },
  m: { s: false, m: true, l: false, xl: false },
  l: { s: false, m: false, l: true, xl: false },
  xl: { s: false, m: false, l: false, xl: true }
};

export class Device {
  constructor() {
    this.js = true;
    this.os = 'unknown';
    this.browser = 'unknown';
    this.device = null;
    this.mobile = false;
    this.touch = false;
    this.width = 0;
    this.height = 0;
    this.breakpoint = 's';
    this.size = SIZE_FLAGS.s;
    this._html = null;
    this._onResize = this._onResize.bind(this);
    this._debouncedResize = lib.debounce(this._onResize, 200);
    this._initialized = false;

    if (typeof window === 'undefined') return;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.breakpoint = this._getBreakpointName(this.width);
    this.size = SIZE_FLAGS[this.breakpoint] || SIZE_FLAGS.s;
    this._html = document.documentElement;
  }

  /**
   * Initializes or reinitializes the device detection,
   * removes previous listeners and CSS classes if needed,
   * then applies new state and listeners.
   */
  init() {
    if (typeof window === 'undefined') return;
    if (this._initialized) this._cleanup();

    this._html = document.documentElement;
    this._detect();
    this._applyHtmlClasses();
    window.addEventListener('resize', this._debouncedResize);
    this._initialized = true;
  }

  /**
   * Removes listeners and CSS classes. Use when unmounting (e.g. Next.js).
   */
  destroy() {
    if (typeof window === 'undefined') return;
    this._cleanup();
  }

  /**
   * Internal cleanup: removes event listeners and clears added classes.
   * @private
   */
  _cleanup() {
    window.removeEventListener('resize', this._debouncedResize);
    if (this._html) this._html.classList.remove(...CLASSES_TO_REMOVE);
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
   * @param {'s'|'m'|'l'|'xl'} bp - Breakpoint name
   * @return {{s:boolean,m:boolean,l:boolean,xl:boolean}}
   * @private
   */
  _getSizeFlags(bp) {
    return SIZE_FLAGS[bp] || SIZE_FLAGS.s;
  }

  /**
   * Handles resize events, updates internal state,
   * and dispatches `breakpointchange` if breakpoint changed.
   *
   * @private
   */
  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const prev = this.breakpoint;
    const next = this._getBreakpointName(w);

    this.width = w;
    this.height = h;
    this.breakpoint = next;
    this.size = SIZE_FLAGS[next] || SIZE_FLAGS.s;

    if (prev !== next) {
      window.dispatchEvent(new CustomEvent('breakpointchange', {
        detail: { prev, current: next, width: w, height: h }
      }));
    }
  }

  /**
   * Detects operating system, browser, device type, and touch support.
   * @private
   */
  _detect() {
    const ua = window.navigator.userAgent.toLowerCase();

    this.mobile = /mobile/.test(ua);

    // Detect OS (order matters - check specific before general)
    if (ua.includes('win')) {
      this.os = 'windows';
    } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
      this.os = 'ios';
    } else if (ua.includes('android')) {
      this.os = 'android';
    } else if (ua.includes('mac')) {
      this.os = 'macos';
    } else if (ua.includes('linux')) {
      this.os = 'linux';
    } else {
      this.os = 'unknown';
    }

    // Detect browser (order matters - check Edge and Opera before Chrome)
    if (/edg\//.test(ua)) {
      this.browser = 'edge';
    } else if (/opr\//.test(ua) || /opera/.test(ua)) {
      this.browser = 'opera';
    } else if (/firefox/.test(ua)) {
      this.browser = 'firefox';
    } else if (/chrome/.test(ua)) {
      this.browser = 'chrome';
    } else if (/safari/.test(ua)) {
      this.browser = 'safari';
    } else {
      this.browser = 'unknown';
    }

    // Detect device type
    if (ua.includes('ipad')) {
      this.device = 'ipad';
    } else if (ua.includes('iphone')) {
      this.device = 'iphone';
    } else if (ua.includes('android')) {
      this.device = 'android';
    } else if (ua.includes('mac')) {
      this.device = 'mac';
    } else {
      this.device = 'computer';
    }

    // Detect touch support
    this.touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  }

  /**
   * Applies detected CSS classes to the <html> element.
   * @private
   */
  _applyHtmlClasses() {
    if (!this._html) return;
    const classes = [
      'js',
      this.os,
      this.browser,
      this.device,
      this.mobile ? 'mobile' : 'desktop',
      this.touch ? 'touch' : null
    ].filter(Boolean);
    this._html.classList.add(...classes);
  }
}

/**
 * Singleton export of the Device observer.
 * @type {Device}
 */
export const device = new Device();
