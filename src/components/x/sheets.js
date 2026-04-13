/**
 * @fileoverview Tab sheets system for switching between content blocks.
 *
 * Provides simple tabs functionality using `[x-sheets]`, `[x-sheet-open]`, and `[x-sheet]` attributes.
 * Handles nested sheets, multiple independent tab groups, and automatic activation of the `.active` tab.
 * Uses CSS classes for state management and supports programmatic control.
 *
 * Exported singleton: `sheets`
 *
 * Usage:
 *
 * Basic setup:
 *   import { sheets } from './sheets.js';
 *   sheets.init();
 *
 * HTML structure:
 *   <div x-sheets>
 *     <nav>
 *       <a x-sheet-open="tab1" class="active">Tab 1</a>
 *       <a x-sheet-open="tab2">Tab 2</a>
 *       <a x-sheet-open="tab3">Tab 3</a>
 *     </nav>
 *     <div x-sheet="tab1" class="active">Content 1</div>
 *     <div x-sheet="tab2">Content 2</div>
 *     <div x-sheet="tab3">Content 3</div>
 *   </div>
 *
 * Programmatic control:
 *   sheets.show('tab2');
 *
 * Nested sheets:
 *   <div x-sheets>
 *     <a x-sheet-open="parent1">Parent Tab</a>
 *     <div x-sheet="parent1">
 *       <div x-sheets>
 *         <a x-sheet-open="child1">Child Tab 1</a>
 *         <a x-sheet-open="child2">Child Tab 2</a>
 *         <div x-sheet="child1">Child Content 1</div>
 *         <div x-sheet="child2">Child Content 2</div>
 *       </div>
 *     </div>
 *   </div>
 *
 * Multiple independent groups:
 *   <div x-sheets id="group1">
 *     <a x-sheet-open="a1">A1</a>
 *     <div x-sheet="a1">Content A1</div>
 *   </div>
 *   <div x-sheets id="group2">
 *     <a x-sheet-open="b1">B1</a>
 *     <div x-sheet="b1">Content B1</div>
 *   </div>
 *
 * Events:
 *   const sheetsContainer = document.querySelector('#mySheets');
 *
 *   sheetsContainer.addEventListener('sheets:ready', (e) => {
 *     console.log('Sheets initialized', e.detail);
 *   });
 *
 *   sheetsContainer.addEventListener('sheets:selected', (e) => {
 *     console.log('Tab selected:', e.detail.sheet);
 *   });
 *
 *   sheetsContainer.addEventListener('sheets:destroy', (e) => {
 *     console.log('Sheets destroyed', e.detail);
 *   });
 *
 * Public API:
 *
 * @method init() - Initializes all [x-sheets] components on the page.
 *   Binds click events to [x-sheet-open] elements and activates tabs with .active class.
 *   Safe for multiple calls - automatically destroys previous listeners.
 *   Dispatches 'sheets:ready' event on each container when done.
 *   @example
 *     sheets.init();
 *
 * @method destroy() - Removes all sheets-related event listeners and resets state.
 *   Safe to call multiple times. Dispatches 'sheets:destroy' event on each container.
 *   @example
 *     sheets.destroy();
 *
 * @method show(xSheet) - Programmatically switches to a specific sheet.
 *   Activates the tab and corresponding content block by matching x-sheet value.
 *   Dispatches 'sheets:selected' event on the container when tab changes.
 *   @param {string} xSheet - The value of x-sheet and x-sheet-open to activate.
 *   @example
 *     sheets.show('tab2');
 *
 * Attributes:
 *
 * - `x-sheets` - Container element that groups tabs and content
 * - `x-sheet-open="value"` - Tab/button that opens a sheet (value must match x-sheet)
 * - `x-sheet="value"` - Content block that corresponds to a tab (value must match x-sheet-open)
 *
 * CSS classes:
 *
 * - `.active` - Added to active tab and content block
 * - Remove `.active` from all tabs/bodies, then add to selected ones
 *
 * Behavior:
 *
 * - Clicking a tab activates it and its corresponding content
 * - Only one tab/content pair is active per [x-sheets] container
 * - Nested sheets work independently
 * - Multiple [x-sheets] containers on the same page work independently
 * - Tab with `.active` class on init is automatically activated
 *
 * SECURITY WARNINGS:
 *
 * 1. Attribute values:
 *    - Values from x-sheet-open and x-sheet are used in CSS selectors
 *    - CSS.escape() is used to prevent XSS through selectors
 *    - Only use trusted content in attribute values
 *
 * 2. HTML content:
 *    - Content in [x-sheet] elements is rendered as-is
 *    - Sanitize user-generated content before rendering
 *
 * Best practices:
 *
 * - Use descriptive, unique values for x-sheet/x-sheet-open
 * - Keep tab and content values in sync
 * - Use semantic HTML (nav, section, etc.)
 * - Test nested sheets behavior
 * - Handle errors gracefully
 *
 * @example
 * // Vanilla JS — plain HTML
 * // index.html:
 * // <div x-sheets id="mySheets">
 * //   <nav>
 * //     <button type="button" x-sheet-open="tab1" class="active">Tab 1</button>
 * //     <button type="button" x-sheet-open="tab2">Tab 2</button>
 * //   </nav>
 * //   <section x-sheet="tab1" class="active">Content 1</section>
 * //   <section x-sheet="tab2">Content 2</section>
 * // </div>
 * //
 * // <script type="module">
 * //   import { sheets } from './src/components/x/sheets.js';
 * //   window.addEventListener('DOMContentLoaded', () => sheets.init());
 * //   window.addEventListener('pagehide', () => sheets.destroy());
 * // </script>
 *
 * @author Andrey Shpigunov
 * @version 0.4
 * @since 2025-07-18
 */

import { lib } from './lib';

/**
 * Sheets system for tabs and content switching.
 */
class Sheets {
  /**
   * Creates a Sheets instance.
   */
  constructor() {
    /**
     * Tracks all bound click handlers for cleanup.
     * Key: Element, Value: Handler function.
     * @type {Map<HTMLElement, Function>}
     * @private
     */
    this._handlers = new Map();
    
    /**
     * Initialization flag to control safe reinitialization.
     * @type {boolean}
     * @private
     */
    this._initialized = false;
  }
  
  /**
   * Dispatch custom event on specific container
   * @param {HTMLElement} container - The x-sheets container element
   * @param {string} eventName - Event name (without 'sheets:' prefix)
   * @param {Object} detail - Event detail data
   * @private
   */
  _dispatchEvent(container, eventName, detail = {}) {
    const event = new CustomEvent(`sheets:${eventName}`, {
      detail,
      bubbles: true,
      cancelable: false
    });
    container.dispatchEvent(event);
  }
  
  /**
   * Validates sheet value to prevent XSS attacks.
   * Only allows alphanumeric characters, hyphens, and underscores.
   * @param {string} value - Sheet value to validate
   * @returns {boolean} - True if valid
   * @private
   */
  _isValidSheetValue(value) {
    if (typeof value !== 'string' || !value) return false;
    return /^[a-zA-Z0-9_-]+$/.test(value);
  }
  
  /**
   * Initializes all `[x-sheets]` components on the page.
   *
   * - Binds click events to `[x-sheet-open]` elements.
   * - Activates the tab with `.active` class by default.
   * - SECURITY: Validates sheet values before use.
   * - Safe for multiple calls; previous listeners are removed.
   * - Dispatches 'sheets:ready' event on each container when initialization is complete.
   */
  init() {
    if (this._initialized) {
      this.destroy();
    }
    
    const sheets = lib.qsa('[x-sheets]');
    if (!sheets.length) {
      return;
    }
    
    for (const sheet of sheets) {
      if (!sheet) continue;
      
      const tabs = lib.qsa('[x-sheet-open]:not([x-sheet-open] [x-sheet-open])', sheet);
      
      for (const tab of tabs) {
        if (!tab) continue;
        
        const sheetValue = tab.getAttribute('x-sheet-open');
        if (!sheetValue) {
          console.warn('sheets.init: Tab has x-sheet-open attribute but no value', tab);
          continue;
        }
        
        // SECURITY: Validate sheet value
        if (!this._isValidSheetValue(sheetValue)) {
          console.error('sheets.init: Invalid sheet value (security check failed):', sheetValue);
          continue;
        }
        
        const handler = (e) => {
          e.preventDefault();
          this.show(sheetValue);
        };
        
        tab.addEventListener('click', handler);
        this._handlers.set(tab, handler);
      }
      
      const active = lib.qs('[x-sheet-open].active', sheet);
      if (active) {
        const activeValue = active.getAttribute('x-sheet-open');
        if (activeValue && this._isValidSheetValue(activeValue)) {
          this.show(activeValue);
        }
      }
      
      // Dispatch ready event on this container
      this._dispatchEvent(sheet, 'ready', {
        container: sheet,
        timestamp: Date.now(),
        initialized: true
      });
    }
    
    this._initialized = true;
  }
  
  /**
   * Removes all event listeners and resets internal state.
   * Safe to call multiple times. Dispatches 'sheets:destroy' event on each container.
   */
  destroy() {
    // Store containers before clearing handlers
    const containers = new Set();
    for (const [el] of this._handlers.entries()) {
      const container = el.closest('[x-sheets]');
      if (container) {
        containers.add(container);
      }
    }
    
    // Remove all event listeners
    for (const [el, handler] of this._handlers.entries()) {
      el.removeEventListener('click', handler);
    }
    
    this._handlers.clear();
    this._initialized = false;
    
    // Dispatch destroy event on each container
    for (const container of containers) {
      this._dispatchEvent(container, 'destroy', {
        container: container,
        timestamp: Date.now(),
        wasInitialized: true
      });
    }
  }
  
  /**
   * Activates a tab and its corresponding content block by `x-sheet` key.
   * SECURITY: Validates sheet value and uses CSS.escape() for selectors.
   * Dispatches 'sheets:selected' event on the container when tab changes.
   *
   * @param {string} xSheet - The value of `x-sheet` and `x-sheet-open` to activate.
   * @param {Object} options - Optional configuration.
   * @param {boolean} options.silent - If true, prevents dispatching 'sheets:selected' event.
   * @param {string} options.source - Source of the selection ('api' or 'user').
   */
  show(xSheet, options = { silent: false, source: 'api' }) {
    if (!xSheet || typeof xSheet !== 'string') {
      console.error('sheets.show: Sheet value is required and must be a string');
      return;
    }
    
    // SECURITY: Validate sheet value
    if (!this._isValidSheetValue(xSheet)) {
      console.error('sheets.show: Invalid sheet value (security check failed):', xSheet);
      return;
    }
    
    // SECURITY: Use CSS.escape() to prevent XSS in selectors
    const escapedValue = CSS.escape(xSheet);
    const targetBody = lib.qs(`[x-sheet="${escapedValue}"]`);
    
    if (!targetBody) {
      console.warn('sheets.show: Target content not found:', xSheet);
      return;
    }
    
    const container = targetBody.closest('[x-sheets]');
    if (!container) {
      console.warn('sheets.show: Sheets container not found for:', xSheet);
      return;
    }
    
    const selectedTab = lib.qs(`[x-sheet-open="${escapedValue}"]`, container);
    
    if (!selectedTab) {
      console.warn('sheets.show: Tab not found:', xSheet);
      return;
    }
    
    // Check if already active
    if (
      selectedTab.classList.contains('active') &&
      targetBody.classList.contains('active')
    ) {
      // Dispatch selected event even if already active (for consistency)
      if (!options.silent) {
        this._dispatchEvent(container, 'selected', {
          sheet: xSheet,
          tab: selectedTab,
          content: targetBody,
          container: container,
          previousSheet: xSheet,
          previousTab: selectedTab,
          previousContent: targetBody,
          wasActive: true,
          source: options.source || 'api',
          timestamp: Date.now()
        });
      }
      return; // Already active
    }
    
    // Get previous active tab and body for event data
    const previousTab = lib.qs('[x-sheet-open].active', container);
    const previousBody = lib.qs('[x-sheet].active', container);
    const previousSheet = previousTab ? previousTab.getAttribute('x-sheet-open') : null;
    
    // Remove active class from all tabs and bodies in this container
    const tabs = lib.qsa('[x-sheet-open]', container);
    const bodies = lib.qsa('[x-sheet]', container);
    
    for (const tab of tabs) {
      if (tab && tab.classList.contains('active')) {
        tab.classList.remove('active');
      }
    }
    
    for (const body of bodies) {
      if (body && body.classList.contains('active')) {
        body.classList.remove('active');
      }
    }
    
    // Add active class to selected tab and body
    selectedTab.classList.add('active');
    targetBody.classList.add('active');
    
    // Dispatch selected event on the container
    if (!options.silent) {
      this._dispatchEvent(container, 'selected', {
        sheet: xSheet,
        tab: selectedTab,
        content: targetBody,
        container: container,
        previousSheet: previousSheet,
        previousTab: previousTab,
        previousContent: previousBody,
        wasActive: false,
        source: options.source || 'api',
        timestamp: Date.now()
      });
    }
  }
}

/**
 * Singleton export of Sheets system.
 * Use `sheets.init()` to initialize or reinitialize safely.
 *
 * @type {Sheets}
 */
export const sheets = new Sheets();
