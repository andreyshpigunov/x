import assert from 'node:assert/strict';
import path from 'node:path';

async function until(read, expected) {
  const deadline = Date.now() + 8000;
  let actual;
  do { actual = await read(); if (actual === expected) return; await new Promise(resolve => setTimeout(resolve, 40)); } while (Date.now() < deadline);
  assert.equal(actual, expected);
}
export async function checkComponents(context, url, output, label) {
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /hydration|server rendered/i.test(message.text())) errors.push(message.text()); });
  try {
    await page.goto(url + '/components');
    assert.equal(await page.evaluate(() => typeof window.x), 'undefined');
    const tablist = page.getByRole('tablist', { name: 'Пример вкладок', exact: true });
    await tablist.getByRole('tab', { name: 'Первая', exact: true }).click();
    await page.getByRole('button', { name: 'Внутренний счётчик: 0', exact: true }).first().click();
    await tablist.getByRole('tab', { name: 'Первая', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await tablist.getByRole('tab', { name: 'Вторая', exact: true }).getAttribute('aria-selected'), 'true');
    await page.getByRole('tab', { name: 'Внутри 2', exact: true }).click();
    assert.equal(await tablist.getByRole('tab', { name: 'Вторая', exact: true }).getAttribute('aria-selected'), 'true');
    await tablist.getByRole('tab', { name: 'Первая', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Внутренний счётчик: 1', exact: true }).count(), 1, 'tabs preserve child state');
    const trigger = page.getByRole('button', { name: 'Открыть меню', exact: true });
    await trigger.focus(); await page.keyboard.press('ArrowDown');
    await until(() => page.getByRole('menuitem', { name: 'Первое действие' }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.getByRole('menuitem', { name: 'Последнее действие' }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Enter');
    assert.equal(await page.getByTestId('menu-action').textContent(), 'Последнее');
    await until(() => trigger.getAttribute('aria-expanded'), 'false');
    await trigger.click(); await page.keyboard.press('Escape');
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    await trigger.click(); await page.getByRole('heading', { name: 'Меню', exact: true }).click();
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    const second = page.getByRole('button', { name: 'Второе меню', exact: true });
    await second.click(); await page.getByRole('menuitem', { name: 'Оставить открытым' }).click();
    assert.equal(await second.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');

    const field = page.getByRole('combobox', { name: 'Поиск города' });
    await field.fill('old'); await page.waitForTimeout(60); await field.fill('new');
    await until(() => page.getByRole('option', { name: 'new 1' }).count(), 1);
    await page.waitForTimeout(400);
    assert.equal(await page.getByRole('option', { name: 'old 1' }).count(), 0);
    await field.press('ArrowDown'); await field.press('ArrowDown'); await field.press('Enter');
    assert.equal(await page.getByTestId('selected-city').textContent(), 'new 2');
    await field.fill('old'); await page.waitForTimeout(60); await field.fill(''); await page.waitForTimeout(400);
    assert.equal(await field.getAttribute('aria-expanded'), 'false', 'clear invalidates pending request');
    await field.fill('error'); await until(() => page.getByRole('listbox').textContent(), 'Не удалось загрузить');
    await field.fill('click'); await page.getByRole('option', { name: 'click 1' }).click();
    assert.equal(await page.getByTestId('selected-city').textContent(), 'click 1');

    const slider = page.getByRole('region', { name: 'Галерея' });
    await slider.scrollIntoViewIfNeeded();
    await slider.focus(); await page.keyboard.press('Home');
    await slider.getByRole('button', { name: 'Внутренний счётчик: 0' }).click();
    await slider.focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByTestId('slide').textContent(), 'Слайд: 2');
    await page.keyboard.press('Home');
    assert.equal(await slider.getByRole('button', { name: 'Внутренний счётчик: 1' }).count(), 1, 'slider preserves React nodes and handlers');
    if (context.browser().browserType().name() === 'chromium') {
      const session = await context.newCDPSession(page);
      await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
      const box = await slider.boundingBox();
      const point = { x: box.x + box.width * .8, y: box.y + 20, id: 1 };
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      for (let step = 1; step <= 5; step++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, x: point.x - box.width * .1 * step }] });
        await page.waitForTimeout(20);
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await until(() => page.getByTestId('slide').textContent(), 'Слайд: 2');
      await session.send('Emulation.setTouchEmulationEnabled', { enabled: false });
      await session.detach();
      await slider.focus(); await page.keyboard.press('Home');
    }
    const rect = await slider.boundingBox();
    await page.mouse.move(rect.x + rect.width - 10, rect.y + 10);
    await until(() => page.getByTestId('slide').textContent(), 'Слайд: 3');
    await slider.dispatchEvent('pointerdown', { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: rect.x + 30, clientY: rect.y + 40 });
    // Synthetic pointer sequence verifies swipe direction and threshold.
    await slider.dispatchEvent('pointerup', { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: rect.x + rect.width - 30, clientY: rect.y + 40 });
    await until(() => page.getByTestId('slide').textContent(), 'Слайд: 2');
    await page.getByRole('button', { name: 'Изменить число слайдов' }).click();
    assert.equal(await slider.locator('[aria-roledescription="slide"]').count(), 1);
    assert.equal(await slider.locator('[inert]').count(), 0, 'shortened slider keeps a visible slide');
    await page.getByRole('button', { name: 'Изменить число слайдов' }).click();

    await page.getByTestId('hover').hover();
    await until(() => page.getByTestId('hover').textContent(), 'Наведение: true');
    await page.mouse.move(0, 0);
    await until(() => page.getByTestId('hover').textContent(), 'Наведение: false');
    const sticky = page.getByText(/^Sticky:/);
    await sticky.scrollIntoViewIfNeeded();
    await sticky.evaluate(el => { el.parentElement.scrollTop = 100; });
    await until(() => page.getByText('Sticky: true', { exact: true }).count(), 1);

    await page.getByRole('region', { name: 'Лента A', exact: true }).scrollIntoViewIfNeeded();
    await until(() => page.getByText('Лента A: 3', { exact: true }).count(), 1);
    await page.getByRole('region', { name: 'Лента B', exact: true }).scrollIntoViewIfNeeded();
    await until(() => page.getByText('Лента B: 3', { exact: true }).count(), 1);
    await page.getByRole('button', { name: 'Сбросить Лента A' }).click();
    await until(() => page.getByText('Лента A: 3', { exact: true }).count(), 1);
    assert.equal(await page.getByText('Лента A: 1', { exact: true }).count(), 1, 'reset does not duplicate data');
    await page.setViewportSize({ width: 390, height: 844 });
    await until(() => page.getByTestId('wide').textContent(), 'Широкий экран: false');
    await trigger.click(); await page.waitForTimeout(200);
    const menu = await page.getByRole('menu', { name: 'Меню', exact: true }).boundingBox();
    assert.ok(menu.x >= 0 && menu.x + menu.width <= 390, 'menu fits mobile viewport');
    await page.screenshot({ path: path.join(output, `${label}-components-mobile.png`) });
    await page.keyboard.press('Escape');
    await page.getByRole('link', { name: 'К анимации' }).click();
    await until(() => page.getByTestId('progress').textContent(), 'Прогресс: 1.00');
    assert.equal(await page.locator('#scroll-target').evaluate(el => el === document.activeElement), true);
    assert.equal(await page.getByAltText('Пример lazy image').getAttribute('loading'), 'lazy');
    await page.getByRole('button', { name: 'Переключить компоненты' }).click();
    assert.equal(await page.getByRole('tablist').count(), 0);
    await page.getByRole('button', { name: 'Переключить компоненты' }).click();
    assert.equal(await page.getByRole('tablist', { name: 'Пример вкладок', exact: true }).count(), 1);
    await field.fill('old'); await page.waitForTimeout(40);
    await page.getByRole('link', { name: 'Уйти со страницы', exact: true }).click();
    await page.waitForURL('**/second'); await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => [...window.__xObservers].flatMap(o => [...o.targets]).filter(el => el.hasAttribute('data-x-observe')).length), 0);
    assert.deepEqual(errors, []);
    console.log(`PASS ${label}: sheets, dropdown, autocomplete races, slider state/swipe, independent feeds, SSR cleanup, responsive hooks`);
  } catch (error) {
    await page.screenshot({ path: path.join(output, `${label}-components-failure.png`) }).catch(() => {});
    throw error;
  } finally { await page.close(); }
}
