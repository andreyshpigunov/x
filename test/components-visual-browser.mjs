import assert from 'node:assert/strict';

export async function checkComponentStyles(context, url, label) {
  const page = await context.newPage();
  try {
    await page.goto(url + '/components');
    await page.getByRole('button', { name: 'Открыть меню', exact: true }).click();
    await page.waitForTimeout(250);
    const properties = ['paddingTop', 'paddingRight', 'borderRadius', 'backgroundColor', 'boxShadow', 'minWidth', 'maxWidth', 'maxHeight', 'transform'];
    const standalone = await page.locator('.x-react-dropdown__menu').first().evaluate((el, properties) => {
      const style = getComputedStyle(el); return Object.fromEntries(properties.map(key => [key, style[key]]));
    }, properties);
    await page.addStyleTag({ url: url + '/legacy/x.css' });
    const result = await page.evaluate(properties => {
      const differences = [];
      const root = document.querySelector('.x-react-dropdown');
      const old = root.cloneNode(true);
      old.className = 'dropdown dropdown_ready dropdown_open';
      const menu = old.querySelector('.x-react-dropdown__menu');
      menu.className = ''; menu.setAttribute('x-dropdown', '');
      for (const button of menu.querySelectorAll('button')) {
        const anchor = document.createElement('a'); anchor.textContent = button.textContent; button.replaceWith(anchor);
      }
      document.body.append(old);
      const css = getComputedStyle(menu);
      const canonical = Object.fromEntries(properties.map(key => [key, css[key]]));
      const slider = document.querySelector('.x-react-slider');
      const oldSlider = slider.cloneNode(true);
      oldSlider.className = 'slider';
      for (const element of oldSlider.querySelectorAll('[class]')) element.className = element.className.replaceAll('x-react-slider', 'slider');
      document.body.append(oldSlider);
      for (const [part, keys] of Object.entries({
        wrapper: ['display', 'width', 'height', 'gap'],
        item: ['minWidth', 'flexBasis', 'display'],
        indicators: ['left', 'right', 'top', 'bottom', 'height', 'gap'],
      })) {
        // Reference widths depend on container width: set both containers alike.
        oldSlider.style.width = slider.getBoundingClientRect().width + 'px';
        const a = getComputedStyle(slider.querySelector('.x-react-slider-' + part));
        const b = getComputedStyle(oldSlider.querySelector('.slider-' + part));
        for (const key of keys) if (a[key] !== b[key]) differences.push(`${part}.${key}: ${a[key]} != ${b[key]}`);
      }
      old.remove(); oldSlider.remove();
      return { canonical, differences };
    }, properties);
    assert.deepEqual(standalone, result.canonical, 'standalone dropdown defaults match vanilla X');
    assert.deepEqual(result.differences, [], 'slider geometry matches vanilla X');
    console.log(`PASS ${label}: dropdown and slider CSS parity`);
  } finally { await page.close(); }
}
