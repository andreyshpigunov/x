import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { Modal, useAppear } from '../src/react/index.js';

test('React entry imports without DOM globals and modal SSR is deterministic', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(renderToString(h(Modal, { open: true, onOpenChange() {}, title: 'Dialog' }, 'Content')), '');
  assert.equal(renderToString(h(Modal, { open: false, onOpenChange() {}, title: 'Dialog' })), '');
});

test('visibility hook has a stable server-rendered state without hiding content', () => {
  function Example() {
    const { ref, visible, appeared } = useAppear();
    return h('section', { ref, 'data-visible': visible, 'data-appeared': appeared }, 'Server content');
  }
  assert.equal(renderToString(h(Example)), '<section data-visible="false" data-appeared="false">Server content</section>');
});

test('remaining components render accessible content without a browser or vanilla globals', async () => {
  const { Sheets, Dropdown, Autocomplete, Slider, LazyImage, ScrollLink,
    useLoadMore, useMediaQuery, useScrollProgress, useSticky, useHover } = await import('../src/react/index.js');
  const tabs = renderToString(h(Sheets, { items: [{ id: 'a', label: 'A', content: 'First' }, { id: 'b', label: 'B', content: 'Second' }] }));
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /aria-selected="true"/);
  assert.match(tabs, /hidden=""/);
  const dropdown = renderToString(h(Dropdown, { trigger: 'Menu', items: [{ id: 'a', label: 'Action' }] }));
  assert.match(dropdown, /aria-expanded="false"/);
  assert.match(dropdown, /role="menuitem"/);
  const autocomplete = renderToString(h(Autocomplete, { label: 'Search', value: '<script>', onValueChange() {}, onSelect() {}, items: ['<script>'] }));
  assert.match(autocomplete, /role="combobox"/);
  assert.ok(!autocomplete.includes('<script>'));
  const slider = renderToString(h(Slider, { defaultValue: 1 }, h('button', { key: 'a' }, 'First'), h('button', { key: 'b' }, 'Second')));
  assert.match(slider, /aria-roledescription="carousel"/);
  assert.match(slider, /inert=""/);
  assert.match(renderToString(h(LazyImage, { src: '/image.jpg', alt: 'Image' })), /loading="lazy"/);
  assert.match(renderToString(h(ScrollLink, { href: '#part' }, 'Scroll')), /href="#part"/);
  function Hooks() {
    const feed = useLoadMore({ loadPage: async () => ({ items: [], hasMore: false }) });
    const media = useMediaQuery('(min-width: 1px)');
    const scroll = useScrollProgress(); const sticky = useSticky(); const hover = useHover();
    return h('p', null, JSON.stringify([feed.items, feed.loading, media, scroll.progress, sticky.stuck, hover.hovered]));
  }
  assert.equal(renderToString(h(Hooks)), '<p>[[],false,false,0,false,false]</p>');
});
