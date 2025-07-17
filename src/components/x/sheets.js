/**
 * @fileoverview Tab sheets system for switching between content blocks.
 *
 * Provides simple tabs functionality using `[x-sheets]`, `[x-sheet-open]`, and `[x-sheet]` attributes.
 * Handles nested sheets, multiple independent tab groups, and automatic activation of the `.active` tab.
 *
 * Public API:
 *
 * - `sheets.init()` – Initializes all `[x-sheets]` components and binds events.
 * - `sheets.show(xSheet)` – Programmatically switches to a specific sheet.
 *
 * Example usage:
 *
 * HTML:
 * <div x-sheets>
 *   <a x-sheet-open="sheetA" class="active">Tab A</a>
 *   <a x-sheet-open="sheetB">Tab B</a>
 *   <div x-sheet="sheetA">Content A</div>
 *   <div x-sheet="sheetB">Content B</div>
 * </div>
 *
 * JS:
 * sheets.show('sheetB');
 *
 * Behavior:
 * - Activates tabs and corresponding content blocks by matching `x-sheet` and `x-sheet-open` values.
 * - Nested sheets are supported; unrelated sheets are not affected.
 *
 * @author Andrey Shpigunov
 * @version 0.2
 * @since 2025-07-17
 */

import { lib } from './lib';

/**
 * Sheets system for tabs and content switching.
 */
class Sheets {
  /**
   * Initializes all `[x-sheets]` components on the page.
   *
   * - Binds click events to `[x-sheet-open]` elements.
   * - Activates the tab with `.active` class by default.
   */
  init() {
    const sheets = lib.qsa('[x-sheets]');
    if (!sheets.length) return;

    for (let sheet of sheets) {
      const tabs = lib.qsa('[x-sheet-open]:not([x-sheet-open] [x-sheet-open])', sheet);

      for (let tab of tabs) {
        tab.addEventListener('click', (e) => {
          e.preventDefault();
          this.show(e.target.getAttribute('x-sheet-open'));
        });
      }

      const active = lib.qs('[x-sheet-open].active', sheet);
      if (active) {
        this.show(active.getAttribute('x-sheet-open'));
      }
    }
  }

  /**
   * Activates a tab and its corresponding content block by `x-sheet` key.
   *
   * @param {string} xSheet - The value of `x-sheet` and `x-sheet-open` to activate.
   */
  show(xSheet) {
    const targetBody = lib.qs(`[x-sheet="${CSS.escape(xSheet)}"]`);
    if (!targetBody) return;

    const sheets = targetBody.closest('[x-sheets]');
    if (!sheets) return;

    const selectedTab = lib.qs(`[x-sheet-open="${CSS.escape(xSheet)}"]`, sheets);

    if (
      selectedTab?.classList.contains('active') &&
      targetBody.classList.contains('active')
    ) return; // Already active

    const tabs = lib.qsa('[x-sheet-open]', sheets);
    lib.removeClass(tabs, 'active');

    const bodies = lib.qsa('[x-sheet]', sheets);
    lib.removeClass(bodies, 'active');

    lib.addClass(selectedTab, 'active');
    lib.addClass(targetBody, 'active');
  }
}

/**
 * Singleton export of Sheets.
 * @type {Sheets}
 */
export const sheets = new Sheets();
