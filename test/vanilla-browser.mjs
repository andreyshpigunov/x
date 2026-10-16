import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import { fileURLToPath } from 'node:url';

// Run after npm run build: node test/vanilla-browser.mjs
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch({headless:true});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent(`
      <div id="transition" style="transition:opacity 1s">Test</div>
      <button x-modal-open="123">Open</button><div x-modal="123">Dialog</div>
      <div id="menu"><button x-dropdown-open>Menu</button><ul x-dropdown><li><a href="#">Item</a></li></ul></div>
      <div id="slider" x-slider><div><button id="slide-button">Click</button></div><div>Second</div></div>
      <div id="single" x-slider><div>One</div></div>
      <div id="outer" x-sheets><button x-sheet-open="a" class="active">A</button><button x-sheet-open="b">B</button>
        <div x-sheet="a"><div id="inner" x-sheets><button x-sheet-open="child" class="active">Child</button><div x-sheet="child" class="active">Child panel</div></div></div><div x-sheet="b">B panel</div>
      </div>`);
    await page.addStyleTag({path:fileURLToPath(new URL('../dist/x.css',import.meta.url))});
    await page.addScriptTag({path:fileURLToPath(new URL('../dist/x.js',import.meta.url))});
    const result = await page.evaluate(async () => {
      const check = (value, message) => {if (!value) throw new Error(message);};
      const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
      const {x} = window;
      for (const alias of ['noTransitions','no-transitions']) {
        document.documentElement.classList.add(alias);
        check(getComputedStyle(document.getElementById('transition')).transitionDuration === '0s',alias+' CSS');
        document.documentElement.classList.remove(alias);
      }
      x.lib.transitionsOff(); x.lib.transitionsOn(10); x.lib.transitionsOff(); await delay(20);
      check(getComputedStyle(document.getElementById('transition')).transitionDuration === '0s','cancel transitionsOn');
      x.lib.transitionsOn(); await delay(10);
      check(getComputedStyle(document.getElementById('transition')).transitionDuration === '1s','transitionsOn restores');
      const button = document.getElementById('slide-button'); let clicks=0;
      button.addEventListener('click',()=>clicks++);
      const single = document.querySelector('#single > div');
      x.init(); x.slider.initSlider(document.getElementById('slider')); x.slider.initSlider(document.getElementById('single'));
      check(document.getElementById('slide-button') === button,'slider keeps node'); button.click();
      check(clicks===1,'slider keeps listener');
      x.sheets.show('b',{container:document.getElementById('outer')});
      check(document.querySelector('#inner [x-sheet-open]').classList.contains('active'),'nested tabs keep selection');
      x.sheets.init(); let selected=0;
      document.getElementById('inner').addEventListener('sheets:selected',()=>selected++);
      document.querySelector('#inner button').click(); check(selected===1,'nested trigger has one handler');
      const dialog=document.getElementById('123'); check(dialog && !document.querySelector('[x-modal]'),'numeric modal conversion');
      let opened=0; dialog.addEventListener('modal:open',()=>opened++);
      const pending=x.modal.show('123'); await delay(25); x.destroy(); await pending; await delay(230);
      check(opened===0 && !dialog.classList.contains('modal_active'),'cancel modal open');
      check(!document.documentElement.classList.contains('modal_active'),'unlock document');
      check(document.querySelector('#slider > div > button')===button,'restore original slider');
      check(!single.classList.contains('slider-item'),'restore single slide');
      check(!document.querySelector('#menu button').hasAttribute('aria-controls'),'restore dropdown ARIA');
      x.init(); await x.modal.show('123'); check(opened===1,'modal reinit'); await x.modal.hide('123');
      const trigger=document.querySelector('#menu button'), menu=document.getElementById('menu');
      let shown=0;menu.addEventListener('dropdown:aftershow',()=>{shown++;check(menu.classList.contains('dropdown_open'),'aftershow follows open');});
      trigger.click(); x.dropdown.destroy(); await delay(30); check(shown===0,'cancel dropdown open');
      x.dropdown.init(); trigger.click(); await delay(30);check(shown===1,'dropdown reinit');
      x.destroy(); await delay(220);
      check(!menu.classList.contains('dropdown_ready'),'dropdown cleanup');
      // Teardown inside a ready event must stop the entire outer init pass.
      menu.addEventListener('dropdown:ready', () => x.destroy(), {once:true});
      x.init();
      check(!x.initialized && !x.dropdown._initialized && !x.slider._initialized,'ready cancels aggregate init');
      check(!trigger.hasAttribute('aria-controls'),'ready cleanup restores ARIA');
      x.init();
      const pendingSlider = document.createElement('div');
      pendingSlider.setAttribute('x-slider','');
      pendingSlider.style.cssText='position:absolute;top:100000px';
      pendingSlider.innerHTML='<div>Deferred</div><div>Second</div>';
      document.body.appendChild(pendingSlider);
      x.slider.observeSliders();
      check(x.slider._observed.has(pendingSlider),'deferred slider observed');
      pendingSlider.remove(); await delay(0);
      check(!x.slider._observed.has(pendingSlider),'detached pending slider released');
      document.body.appendChild(pendingSlider); await delay(0);
      check(x.slider._observed.has(pendingSlider),'reinserted slider observed again');
      pendingSlider.remove();
      const search = document.createElement('div'); search.id='search';
      search.innerHTML='<input x-dropdown-open value="query"><ul x-dropdown></ul>';
      document.body.appendChild(search);x.dropdown.init();
      x.autocomplete.init('search', {resetFunc:()=>x.autocomplete.init('search',{defaultStateHtml:'new instance'})});
      x.autocomplete.destroy('search');
      check(x.autocomplete.get('search') && search.querySelector('ul').textContent==='new instance','reset callback replacement survives');
      x.destroy();
      for(let cycle=0;cycle<3;cycle++){x.init();x.destroy();}
      check(document.getElementById('slide-button')===button,'repeated cycles preserve original DOM');
      return true;
    });
    assert.equal(result,true);
    assert.deepEqual(errors,[]);
    console.log(`PASS vanilla lifecycle / ${engine.name()}: CSS aliases, modal, dropdown, nested sheets, slider, destroy/init`);
  } finally {await browser.close();}
}
