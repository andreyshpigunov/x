import assert from 'node:assert/strict';
import path from 'node:path';

export async function checkModalVisuals(context, url, output, label) {
  const page = await context.newPage();
  try {
    await page.goto(url);
    const opener = page.getByRole('button', { name: 'Открыть окно', exact: true });
    const dialog = page.getByRole('dialog', { name: 'Контакт', exact: true });
    for (const effect of ['default', 'in', 'out', 'up', 'down', 'left', 'right']) {
      await page.getByLabel('Эффект открытия').selectOption(effect);
      await opener.click();
      await page.waitForTimeout(260);
      const window = dialog.locator('.x-react-modal__window');
      assert.equal(await window.evaluate(el => getComputedStyle(el).opacity), '1');
      const transform = await dialog.evaluate(el => {
        const clone = el.cloneNode(true);
        clone.removeAttribute('data-active');
        clone.style.visibility = 'hidden';
        const panel = clone.querySelector('.x-react-modal__window');
        panel.style.transition = 'none';
        document.body.append(clone);
        const result = getComputedStyle(panel).transform;
        clone.remove();
        return result;
      });
      await page.keyboard.press('Escape');
      assert.equal(await dialog.count(), 1, 'dialog remains modal during exit');
      assert.equal(await page.evaluate(() => document.documentElement.style.overflow), 'hidden');
      await page.waitForTimeout(260);
      assert.equal(await page.locator('dialog[open]').count(), 0);

      const expected = { default: 'matrix(0.97, 0, 0, 0.97, 0, 0)', in: 'matrix(0.9, 0, 0, 0.9, 0, 0)', out: 'matrix(1.1, 0, 0, 1.1, 0, 0)', up: 'matrix(1, 0, 0, 1, 0, 30)', down: 'matrix(1, 0, 0, 1, 0, -30)', left: 'matrix(1, 0, 0, 1, -30, 0)', right: 'matrix(1, 0, 0, 1, 30, 0)' };
      assert.equal(transform, expected[effect], effect);
    }
    await page.getByLabel('Свои CSS-переменные').check();
    await opener.click();
    await page.waitForTimeout(450);
    const custom = await dialog.locator('.x-react-modal__window').evaluate(el => {
      const css = getComputedStyle(el);
      return [css.width, css.backgroundColor, css.borderRadius, css.paddingTop, css.transitionDuration];
    });
    assert.deepEqual(custom, ['640px', 'rgb(255, 248, 232)', '8px', '60px', '0.4s, 0.4s']);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    assert.equal(await page.locator('dialog[open]').count(), 1, 'custom exit duration respected');
    // Programmatic reopen during the exit must cancel its pending close timer.
    await opener.evaluate(el => el.click());
    await page.waitForTimeout(450);
    assert.equal(await page.locator('dialog[open]').count(), 1, 'rapid reopen survives old timer');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(450);
    await page.getByLabel('Свои CSS-переменные').uncheck();
    await page.getByLabel('Длинное содержимое').check();
    await opener.click();
    await page.waitForTimeout(260);
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      // Safari can scroll the focused field into view after resizing. Wait for
      // that layout before testing an intentional user scroll.
      await page.waitForTimeout(150);
      await dialog.locator('.x-react-modal__outer').evaluate(el => { el.scrollTop = 600; });
      await page.waitForTimeout(100);
      assert.ok(await dialog.locator('.x-react-modal__outer').evaluate(el => el.scrollTop) >= 500, 'long window really scrolled');
      const close = await dialog.getByRole('button', { name: 'Закрыть', exact: true }).boundingBox();
      assert.ok(close.y >= 0 && close.y <= 10, 'cross stays pinned at viewport top');
      assert.ok(close.x >= 0 && close.x + close.width <= viewport.width, 'cross stays inside viewport');
      await page.screenshot({ path: path.join(output, `${label}-sticky-${viewport.width}.png`) });
    }
    await dialog.getByRole('button', { name: 'Закрыть', exact: true }).click();
    await page.waitForTimeout(260);
    await page.setViewportSize({ width: 1280, height: 900 });
    // Compare actual computed styles with canonical vanilla CSS in the same document.
    await page.addStyleTag({ url: url + '/legacy/x.css' });
    await opener.click();
    await page.waitForTimeout(260);
    const differences = await dialog.evaluate(root => {
      const old = document.createElement('div');
      old.className = 'modal modal_ready modal_active';
      old.innerHTML = root.innerHTML.replaceAll('x-react-modal__', 'modal-');
      // Vanilla renders its cross as an anchor, so site-wide button styles must
      // not contaminate the reference used for comparison.
      for (const button of old.querySelectorAll('.modal-close')) {
        const anchor = document.createElement('a');
        anchor.className = 'modal-close';
        anchor.setAttribute('role', 'button');
        button.replaceWith(anchor);
      }
      document.body.append(old);
      const differences = [];
      for (const [part, properties] of Object.entries({
        overlay: ['backgroundColor', 'opacity', 'transitionDuration'],
        outer: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'overflowY'],
        window: ['maxWidth', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'backgroundColor', 'boxShadow', 'borderRadius', 'transformOrigin'],
        rail: ['top', 'bottom', 'right', 'width'],
        close: ['position', 'top', 'width', 'height', 'marginLeft', 'backgroundColor', 'borderRadius', 'opacity']
      })) {
        const react = getComputedStyle(root.querySelector('.x-react-modal__' + part));
        const vanilla = getComputedStyle(old.querySelector('.modal-' + part));
        for (const property of properties) if (react[property] !== vanilla[property]) differences.push(`${part}.${property}: ${react[property]} != ${vanilla[property]}`);
      }
      for (const pseudo of ['::before', '::after']) {
        const react = getComputedStyle(root.querySelector('.x-react-modal__close'), pseudo);
        const vanilla = getComputedStyle(old.querySelector('.modal-close'), pseudo);
        for (const property of ['width', 'height', 'top', 'left', 'backgroundColor', 'transform']) if (react[property] !== vanilla[property]) differences.push(`${pseudo}.${property}`);
      }
      old.remove();
      return differences;
    });
    assert.deepEqual(differences, [], 'React retains canonical X geometry and cross');
    console.log(`PASS ${label}: X visual parity, seven effects, exit timing, rapid reopen, CSS variables, sticky cross`);
  } finally { await page.close(); }
}
