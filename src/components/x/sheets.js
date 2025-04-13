//
//  sheets.js / x
//  Sheets
//
//  Created by Andrey Shpigunov at 20.03.2025
//  All rights reserved.
//
//  Tab sheets component
//
//  Example usage:
//  <div x-sheets>
//    <a x-sheet-open="sheetA" class="active">Sheet</a>
//    <a x-sheet-open="sheetB">Sheet</a>
//    <div x-sheet="sheetA">Sheet content</div>
//    <div x-sheet="sheetB">Sheet content</div>
//  </div>
//
//  You can wrap tabs and sheets in any additional tags.
//  Nested sheets will be hidden when they lose focus.
//
//  API:
//    this.show(xSheet) — manually activate a sheet by x-sheet attribute value
//

import { lib } from './lib';

class Sheets {
  /**
   * Initializes all [x-sheets] blocks on the page.
   * Adds click event listeners to [x-sheet-open] elements (tabs),
   * and activates the tab marked with `.active` by default.
   */
  init() {
    // Find all [x-sheets] containers
    let sheets = lib.qsa('[x-sheets]');
    if (!sheets.length) return;

    for (let sheet of sheets) {
      // Find all tab elements inside the sheet container
      let tabs = lib.qsa('[x-sheet-open]:not([x-sheet-open] [x-sheet-open])', sheet);
      if (tabs.length) {
        for (let tab of tabs) {
          // Attach click handler to each tab
          tab.addEventListener('click', (e) => {
            e.preventDefault();
            this.show(e.target.getAttribute('x-sheet-open'));
          });
        }
      }

      // Automatically activate the tab that has the .active class
      let active = lib.qs('[x-sheet-open].active', sheet);
      if (active) {
        this.show(active.getAttribute('x-sheet-open'));
      }
    }
  }

  /**
   * Shows the tab and corresponding content block by x-sheet key.
   * @param {string} xSheet - The identifier specified in x-sheet and x-sheet-open attributes.
   */
  show(xSheet) {
    // Find the corresponding content element
    let targetBody = lib.qs(`[x-sheet="${CSS.escape(xSheet)}"]`);
    if (!targetBody) return;

    // Find the parent [x-sheets] container
    let sheets = targetBody.closest('[x-sheets]');
    if (!sheets) return;

    // Find the tab that triggered the sheet
    let selectedTab = lib.qs(`[x-sheet-open="${CSS.escape(xSheet)}"]`, sheets);
    if (
      selectedTab?.classList.contains('active') &&
      targetBody?.classList.contains('active')
    ) return; // Already active, no need to update

    // Deactivate all tabs
    let tabs = lib.qsa('[x-sheet-open]', sheets);
    lib.removeClass(tabs, 'active');

    // Deactivate all sheet content blocks
    let bodies = lib.qsa('[x-sheet]', sheets);
    lib.removeClass(bodies, 'active');

    // Activate the selected tab and its content
    lib.addClass(selectedTab, 'active');
    lib.addClass(targetBody, 'active');
  }
}

export const sheets = new Sheets();
