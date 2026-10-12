import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import path from 'node:path';
import { checkComponentStyles } from './components-visual-browser.mjs';
import { checkComponents } from './components-browser.mjs';
import { checkModalVisuals } from './modal-visual-browser.mjs';

async function until(read, expected, label) {
  const deadline = Date.now() + 8000;
  let actual;
  while (Date.now() < deadline) {
    actual = await read();
    if (actual === expected) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(actual, expected, label);
}

export async function runBrowserChecks(url, output, mode, engines) {
  for (const engine of engines) {
    const browser = await ({ chromium, webkit })[engine].launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(() => {
      const Original = window.IntersectionObserver;
      window.__xObservers = new Set();
      window.IntersectionObserver = class extends Original {
        constructor(...args) { super(...args); this.targets = new Set(); window.__xObservers.add(this); }
        observe(target) { this.targets.add(target); super.observe(target); }
        unobserve(target) { this.targets.delete(target); super.unobserve(target); }
        disconnect() { this.targets.clear(); super.disconnect(); }
      };
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && /hydrat|server rendered|did not match/i.test(message.text())) errors.push(message.text());
    });
    const visibleDialogs = () => page.locator('dialog[open]').count();
    const locked = () => page.evaluate(() => document.documentElement.style.overflow);
    const modal = () => page.getByRole('dialog', { name: 'Контакт', exact: true });
    try {
      const html = await (await fetch(url)).text();
      assert.ok(html.includes('Повторное наблюдение'), 'Server-rendered content is present');
      await page.goto(url);
      assert.equal(await page.evaluate(() => typeof window.x), 'undefined', 'React entry does not initialize vanilla X');
      const opener = page.getByRole('button', { name: 'Открыть окно', exact: true });
      await opener.click();
      await until(visibleDialogs, 1, 'opens');
      await until(() => page.getByLabel('Имя', { exact: true }).evaluate(el => el === document.activeElement), true, 'initial focus');
      await page.getByLabel('Имя', { exact: true }).fill('Андрей');
      assert.equal(await page.getByTestId('greeting').textContent(), 'Здравствуйте, Андрей!');
      await page.getByRole('button', { name: 'Счётчик: 0' }).click();
      assert.equal(await page.getByRole('button', { name: 'Счётчик: 1' }).count(), 1);
      await page.keyboard.press('Escape');
      await until(visibleDialogs, 0, 'escape closes');
      await until(() => opener.evaluate(el => el === document.activeElement), true, 'focus returns');
      assert.equal(await locked(), '');
      assert.equal(await page.getByTestId('changes').textContent(), 'Запросов закрытия: 1');

      await opener.click();
      await page.getByRole('button', { name: 'Открыть вложенное', exact: true }).click();
      await until(visibleDialogs, 2, 'nested modal opens');
      // Tab must never move into the background or the lower dialog.
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        assert.equal(await page.getByRole('dialog', { name: 'Вложенное окно' }).evaluate(el => el.contains(document.activeElement)), true);
      }
      await page.keyboard.press('Escape');
      await until(visibleDialogs, 1, 'escape closes only the top dialog');
      assert.equal(await locked(), 'hidden');
      await until(() => page.getByRole('button', { name: 'Открыть вложенное', exact: true }).evaluate(el => el === document.activeElement), true, 'nested focus returns');
      await page.getByRole('button', { name: 'Открыть независимое поверх' }).click();
      await until(visibleDialogs, 2, 'independent modal opens');
      await page.getByRole('button', { name: 'Удалить нижнее окно' }).click();
      await until(visibleDialogs, 1, 'lower modal unmounts');
      assert.equal(await locked(), 'hidden', 'remaining modal keeps scroll lock');
      await page.keyboard.press('Escape');
      await until(visibleDialogs, 0, 'last modal closes');
      assert.equal(await locked(), '');

      await page.getByLabel('Закрывать по Escape и фону').uncheck();
      await opener.click();
      await until(visibleDialogs, 1, 'protected modal opens');
      await page.keyboard.press('Escape');
      await page.mouse.click(4, 4);
      assert.equal(await visibleDialogs(), 1, 'dismissal can be disabled');
      await modal().getByRole('button', { name: 'Закрыть', exact: true }).click();
      await until(visibleDialogs, 0, 'close button still works');
      await page.getByLabel('Закрывать по Escape и фону').check();
      await opener.click();
      await until(visibleDialogs, 1, 'backdrop test opens');
      await page.mouse.click(4, 4);
      await until(visibleDialogs, 0, 'backdrop closes');

      await opener.click();
      await page.getByRole('link', { name: 'Уйти со страницы' }).click();
      await page.waitForURL('**/second');
      await until(visibleDialogs, 0, 'route change removes portals');
      assert.equal(await locked(), '', 'route change restores scroll');
      assert.equal(await page.evaluate(() => [...window.__xObservers].flatMap(o => [...o.targets]).filter(el => el.hasAttribute('data-x-observe')).length), 0, 'route change disconnects observers');
      await page.getByRole('link', { name: 'Вернуться к проверкам' }).click();
      await page.waitForURL(url + '/');

      await until(() => page.getByTestId('appearance-status').textContent(), 'Виден: false · Был виден: false', 'initial visibility');
      await page.getByTestId('appearance-target').scrollIntoViewIfNeeded();
      await until(() => page.getByTestId('appearance-status').textContent(), 'Виден: true · Был виден: true', 'intersection');
      await page.getByTestId('once-target').scrollIntoViewIfNeeded();
      await until(() => page.getByTestId('once-status').textContent(), 'Один раз: true', 'once appeared');
      await page.evaluate(() => window.scrollTo(0, 0));
      await until(() => page.getByTestId('appearance-status').textContent(), 'Виден: false · Был виден: true', 'exit preserves appeared');
      assert.equal(await page.getByTestId('once-status').textContent(), 'Один раз: true');
      assert.equal(await page.evaluate(() => [...window.__xObservers].some(o => [...o.targets].some(el => el.dataset.xObserve === 'once'))), false, 'once disconnects');
      await page.getByRole('button', { name: 'Заменить наблюдаемый элемент' }).click();
      await until(() => page.getByTestId('appearance-status').textContent(), 'Виден: false · Был виден: false', 'new node resets visibility');
      await page.getByTestId('scroll-root').scrollIntoViewIfNeeded();
      assert.equal(await page.getByTestId('inner-status').textContent(), 'В контейнере: false');
      await page.getByTestId('scroll-root').evaluate(el => { el.scrollTop = el.scrollHeight; });
      await until(() => page.getByTestId('inner-status').textContent(), 'В контейнере: true', 'custom root works');

      await page.goto(url + '/initial');
      await until(visibleDialogs, 1, 'initially open dialog hydrates');
      await page.getByRole('button', { name: 'Удалить компонент' }).click();
      await until(visibleDialogs, 0, 'unmount while open');
      assert.equal(await locked(), '');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole('button', { name: 'Открыть окно', exact: true }).click();
      await until(visibleDialogs, 1, 'mobile modal opens');
      const bounds = await modal().boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390, 'mobile dialog fits');
      await page.screenshot({ path: path.join(output, `${mode}-${engine}-mobile.png`), fullPage: false });
      await page.keyboard.press('Escape');
      await until(visibleDialogs, 0, 'mobile exit finishes');
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.screenshot({ path: path.join(output, `${mode}-${engine}-desktop.png`), fullPage: false });

      // Existing page styles and a vanilla modal can coexist with the React entry.
      await page.evaluate(() => document.documentElement.style.setProperty('overflow', 'auto', 'important'));
      await page.getByRole('button', { name: 'Открыть окно', exact: true }).click();
      await until(visibleDialogs, 1, 'style restoration test opens');
      await page.keyboard.press('Escape');
      await until(visibleDialogs, 0, 'style restoration test closes');
      assert.equal(await locked(), 'auto');
      assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyPriority('overflow')), 'important');
      await page.evaluate(() => document.documentElement.style.removeProperty('overflow'));
      await page.addStyleTag({ url: url + '/legacy/x.css' });
      await page.addScriptTag({ url: url + '/legacy/x.js' });
      await page.evaluate(async () => {
        const definition = document.createElement('div');
        definition.setAttribute('x-modal', 'coexisting');
        definition.innerHTML = '<h2>Старое окно</h2><button id="open-react-from-legacy">Открыть React поверх</button>';
        document.body.appendChild(definition);
        window.x.modal.init();
        document.getElementById('open-react-from-legacy').onclick = () => {
          [...document.querySelectorAll('main button')].find(button => button.textContent === 'Открыть окно').click();
        };
        await window.x.modal.show('coexisting');
      });
      await page.getByRole('button', { name: 'Открыть React поверх' }).click();
      await until(visibleDialogs, 1, 'React dialog opens above vanilla');
      await page.keyboard.press('Escape');
      await until(visibleDialogs, 0, 'React dialog closes independently');
      assert.equal(await page.locator('#coexisting.modal_active').count(), 1, 'Escape does not close the underlying vanilla modal');
      await page.keyboard.press('Escape');
      await until(() => page.locator('#coexisting.modal_ready').count(), 0, 'underlying vanilla dialog remains functional');

      await page.goto(url + '/legacy.html');
      await page.getByRole('button', { name: 'Открыть обычную модалку' }).click();
      await until(() => page.locator('#legacy-dialog.modal_active').count(), 1, 'vanilla API still opens');
      // Vanilla API intentionally ignores commands during its 200ms transition.
      await page.waitForTimeout(250);
      await page.keyboard.press('Escape');
      await until(() => page.locator('#legacy-dialog.modal_ready').count(), 0, 'vanilla API still closes');
      assert.deepEqual(errors, [], 'No browser or hydration errors');

      await checkModalVisuals(context, url, output, `${mode}-${engine}`);

      await checkComponents(context, url, output, `${mode}-${engine}`);

      await checkComponentStyles(context, url, `${mode}-${engine}`);

      const fallback = await browser.newPage();
      await fallback.addInitScript(() => { delete window.IntersectionObserver; });
      await fallback.goto(url);
      await until(() => fallback.getByTestId('appearance-status').textContent(), 'Виден: true · Был виден: true', 'missing observer fallback');
      await fallback.close();
      console.log(`PASS ${mode} / ${engine}: SSR, hydration, focus, nesting, cleanup, visibility, mobile, vanilla`);
    } catch (error) {
      await page.screenshot({ path: path.join(output, `${mode}-${engine}-failure.png`) }).catch(() => {});
      throw error;
    } finally {
      await browser.close();
    }
  }
}
