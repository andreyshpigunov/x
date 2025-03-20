//
//  dropdown.js / x
//  Dropdown menu
//
//  Created by Andrey Shpigunov at 20.03.2025
//  All right reserved.
//
//
//  Connect styles and add html code:
//  <div> or any parent element
//    <button x-dropdown-open>Open</button>
//    <ul x-dropdown>
//      <li>Menu item</li>
//      ...
//    </ul>
//  </div>


import { lib } from './lib';


class Dropdown {
  
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
            lib.removeClass(trigger, 'active');
            lib.removeClass(parent, 'dropdown_open', 200);
            return false;
          }
          
          // Close all opened menus
          if (allOpened.length) {
            lib.removeClass('.dropdown_open [x-dropdown-open]', 'active');
            lib.removeClass('.dropdown_open', 'dropdown_open', 200);
          }
          
          // Open current menu
          lib.addClass(trigger, 'active');
          lib.addClass(parent, 'dropdown_open', 20);
          
        })
        
        // Close menu on click outside
        document.addEventListener('click', e => {
          if (
            !e.target.matches('[x-dropdown-open], [x-dropdown-open] *') &&
            !e.target.matches('[x-dropdown] .dropdown_stay, [x-dropdown] .dropdown_stay *')
          ) {
            lib.removeClass('.dropdown_open [x-dropdown-open]', 'active');
            lib.removeClass('.dropdown_open', 'dropdown_open', 200);
          }
        });
      }
    })
  }
  
}

export const dropdown = new Dropdown({});
