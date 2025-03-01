//
//  sheets.js
//  x | Sheets
//  Created by Andrey Shpigunov at 12.02.2025
//  All right reserved.
//
//
//  Tab sheets
//  <div x-sheets>
//    <a class="sheet-tab active" x-sheet="sheetA">Sheet</a>
//    <a class="sheet-tab" x-sheet="sheetB">Sheet</a>
//    <div id="sheetA" class="sheet-body active">Sheet content</div>
//    <div id="sheetB" class="sheet-body">Sheet content</div>
//  </div>
//
//  Tab sheets
//  <div x-sheets>
//    <a x-sheet-open="sheetA" class="active">Sheet</a>
//    <a x-sheet-open="sheetB">Sheet</a>
//    <div x-sheet="sheetA">Sheet content</div>
//    <div x-sheet="sheetB">Sheet content</div>
//  </div>
//
//  No limits for wrapping tabs and sheets in another tags.
//  But all nested sheets will be inactive, when focus out.
//
//  API call:
//  this.show(xSheet) — show sheet
//  xSheet — x-sheet attribute
//

import { lib } from "./lib";

class Sheets {
  init() {
    // Get sheets
    let sheets = lib.qsa("[x-sheets]");
    if (sheets.length) {
      for (let sheet of sheets) {
        // Get sheet tabs
        let tabs = lib.qsa("[x-sheet-open]:not([x-sheet-open] [x-sheet-open])", sheet);
        if (tabs.length) {
          for (let tab of tabs) {
            tab.addEventListener("click", (e) => {
              e.preventDefault();
              this.show(e.target.getAttribute("x-sheet-open"));
            });
          }
        }

        // Set active tab
        let active = lib.qs("[x-sheet-open].active", sheet);
        if (active) {
          // active = lib.qs("[x-sheet-open]", sheet);
          this.show(active.getAttribute("x-sheet-open"));
        }
      }
    }
  }

  show(xSheet) {
    // Get parent '.sheets' element (context)
    let sheets = lib.qs("[x-sheet=" + xSheet + "]").closest("[x-sheets]");

    // Remove class 'active' from tabs
    let tabs = lib.qsa("[x-sheet-open]", sheets);
    lib.removeClass(tabs, "active");

    // Remove class 'active' from bodies
    let bodies = lib.qsa("[x-sheet]", sheets);
    lib.removeClass(bodies, "active");

    // Add class 'active' to selected tab and body
    let selectedTab = lib.qs("[x-sheet-open=" + xSheet + "]");
    let selectedBody = lib.qs("[x-sheet=" + xSheet + "]");
    lib.addClass(selectedTab, "active");
    lib.addClass(selectedBody, "active");
  }
}

export const sheets = new Sheets();
