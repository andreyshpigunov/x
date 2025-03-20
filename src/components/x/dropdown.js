//
//  dropdown.js / x
//  Dropdown menu
//
//  Created by Andrey Shpigunov at 20.03.2025
//  All right reserved.
//
//
//  Connect styles and add html code:
//  <div id="menu"> or any parent element
//    <button x-dropdown-open>Open</button>
//    <ul x-dropdown>
//      <li>Menu item</li>
//      ...
//    </ul>
//  </div>
//
//  <script>
//    let menu = qs('#menu');
//    menu.addEventListener('dropdown:ready', event => { ... });
//    menu.addEventListener('dropdown:beforeshow', event => { ... });
//    menu.addEventListener('dropdown:aftershow', event => { ... });
//    menu.addEventListener('dropdown:beforehide', event => { ... });
//    menu.addEventListener('dropdown:afterhide', event => { ... });
//
//    qsa('.dropdown').forEach(item => {
//      item.addEventListener('dropdown:beforeshow', e => { console.log('Before show') })
//    });
//  </script>
//


import { lib } from './lib';


class Dropdown {
  
  constructor() {
    // Dropdown events
    this.eventReady      = new CustomEvent('dropdown:ready');
    this.eventBeforeShow = new CustomEvent('dropdown:beforeshow');
    this.eventAfterShow  = new CustomEvent('dropdown:aftershow');
    this.eventBeforeHide = new CustomEvent('dropdown:beforehide');
    this.eventAfterHide  = new CustomEvent('dropdown:afterhide');
  }
  
  init() {
    qsa('[x-dropdown]').forEach(menu => {
      let parent = menu.parentElement;
      let trigger = qs('[x-dropdown-open]', parent);
      
      if (trigger) {
        // Add parent class
        parent.classList.add('dropdown');
        trigger.addEventListener('click', e => {
          
          let isOpened = parent.classList.contains('dropdown_open');
          let allOpened = qsa('.dropdown_open');
          
          // If menu was opened
          if (isOpened) {
            parent.dispatchEvent(this.eventBeforeHide);
            lib.removeClass(trigger, 'active');
            lib.removeClass(parent, 'dropdown_open', 200);
            parent.dispatchEvent(this.eventAfterHide);
            return false;
          }
          
          // Close all opened menus
          if (allOpened.length) {
            parent.dispatchEvent(this.eventBeforeHide);
            lib.removeClass('.dropdown_open [x-dropdown-open]', 'active');
            lib.removeClass('.dropdown_open', 'dropdown_open', 200);
            parent.dispatchEvent(this.eventAfterHide);
          }
          
          // Open current menu
          parent.dispatchEvent(this.eventBeforeShow);
          lib.addClass(trigger, 'active');
          lib.addClass(parent, 'dropdown_open', 20);
          parent.dispatchEvent(this.eventAfterShow);
          
        })
        
        // Close menu on click outside
        document.addEventListener('click', e => {
          if (
            !e.target.matches('[x-dropdown-open], [x-dropdown-open] *') &&
            !e.target.matches('[x-dropdown] .dropdown_stay, [x-dropdown] .dropdown_stay *')
          ) {
            parent.dispatchEvent(this.eventBeforeHide);
            lib.removeClass('.dropdown_open [x-dropdown-open]', 'active');
            lib.removeClass('.dropdown_open', 'dropdown_open', 200);
            parent.dispatchEvent(this.eventAfterHide);
          }
        });
        
        parent.dispatchEvent(this.eventReady)
      }
    })
  }
  
}

export const dropdown = new Dropdown({});
