//
//	sheets.js
//	auto-x
//
//	Created by Andrey Shpigunov on 04.09.2024.
//
//
//  Tab sheets
//  <div class="sheets">
//    <a class="sheets-tab active" data-sheet="sheetA">Sheet</a> — active tab
//    <a class="sheets-tab" data-sheet="sheetB">Sheet</a>
//    <div id="sheetA" class="sheets-body active">Sheet content</div> — active sheet
//    <div id="sheetB" class="sheets-body">Sheet content</div>
//  </div>
//  No limits for wrapping tabs and sheets in another tags.
//
//  API call:
//  this.show(sheetId) — show sheet
//  sheetId — sheet id


import { lib } from './lib';


class Sheets {
    
    init() {
        let sheets = lib.qsa('.sheets');
        if (sheets) {
            sheets.forEach(e => {
                // try {
                    let tabs = lib.qsa('.sheets-tab', e);
                    if (tabs) {
                        tabs.forEach(tab => {
                            tab.addEventListener('click', (event) => {
                                event.preventDefault();
                                this.show(tab.dataset.sheet)
                            })
                        })
                    }
                    let activeTab = lib.qs('.sheets-tab.active', e);
                    if (activeTab) {
                        this.show(activeTab.dataset.sheet)
                    } else {
                        let bodies = lib.qsa('.sheets-body', e);
                        if (bodies) {
                            let i = 1;
                            bodies.forEach(body => {
                                if (i == 1) {
                                    this.show(body.getAttribute('id'));
                                    i++
                                }
                            })
                        }
                    }
                // } catch (err) {
                    // console.error(err);
                // }
            })
        }
    }
    
    show(sheetId) {
        let tab = lib.qsa('[data-sheet=" + sheetId + "]')[0];
        let body = document.getElementById(sheetId);
        let sheets = body.closest('.sheets');
        
        // Remove class 'active' from tabs and bodies
        let tabs = lib.qsa('.sheets-tab', sheets);
        if (tabs) { tabs.forEach(tab => { tab.classList.remove('active') }) }
        let bodies = lib.qsa('.sheets-body', sheets);
        if (bodies) { bodies.forEach(body => { body.classList.remove('active') }) }
        
        // Add class 'active' to selected tab and body
        if (tab) tab.classList.add('active');
        if (body) body.classList.add('active');
    }
}

export const sheets = new Sheets();
