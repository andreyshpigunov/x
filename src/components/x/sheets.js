//
//	sheets.js
//	x
//
//	Created by Andrey Shpigunov on 21.09.2024.
//
//  Tab sheets
//  <div x-sheets>
//    <a class="sheet-tab active" x-sheet="sheetA">Sheet</a>
//    <a class="sheet-tab" x-sheet="sheetB">Sheet</a>
//    <div id="sheetA" class="sheet-body active">Sheet content</div>
//    <div id="sheetB" class="sheet-body">Sheet content</div>
//  </div>
//
//  No limits for wrapping tabs and sheets in another tags.
//
//  API call:
//  this.show(sheetId) — show sheet
//  sheetId — sheet id


import { lib } from './lib';


class Sheets {
    
    init() {
        // Get sheets
        let sheets = lib.qsa('[x-sheets]');
        if (sheets.length) {
            for (let sheet of sheets) {
                
                // Get sheet tabs
                let tabs = lib.qsa('[x-sheet]', sheet);
                if (tabs.length) {
                    for (let tab of tabs) {
                        tab.addEventListener('click', e => {
                            e.preventDefault();
                            this.show(e.target.getAttribute('x-sheet'))
                        })
                    }
                }
                
                // Set active tab
                let active = lib.qs('.sheet-tab.active', sheet);
                if (!active) active = lib.qs('.sheet-tab', sheet);
                this.show(active.getAttribute('x-sheet'))
                
            }
        }
    }
    
    show(sheetId) {
        // Get parent '.sheets' element (context)
        let sheets = lib.qs('#' + sheetId).closest('[x-sheets]');
        
        // Remove class 'active' from tabs
        let tabs = lib.qsa('.sheet-tab', sheets);
        lib.removeClass(tabs, 'active');
        
        // Remove class 'active' from bodies
        let bodies = lib.qsa('.sheet-body', sheets);
        lib.removeClass(bodies, 'active');
        
        // Add class 'active' to selected tab and body
        let selectedTab  = lib.qs('[x-sheet=' + sheetId + ']');
        let selectedBody = lib.qs('#' + sheetId);
        lib.addClass(selectedTab, 'active');
        lib.addClass(selectedBody, 'active');
    }
}

export const sheets = new Sheets();
