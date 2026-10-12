'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppear } from './use-appear.js';
import { useLatest } from './shared.js';

export function useLoadMore({ loadPage, initialPage = 1, root = null, rootMargin = '0px 0px 400px 0px', resetKey, enabled = true }) {
  const seen = useAppear({ root, rootMargin });
  const latest = useLatest(loadPage);
  const state = useRef(null);
  const [snapshot, setSnapshot] = useState({ items: [], loading: false, hasMore: true, error: null, page: initialPage });
  useEffect(() => {
    const current = { items: [], loading: false, hasMore: true, error: null, page: initialPage, active: true, controller: null };
    state.current = current;
    setSnapshot({ ...current });
    return () => { current.active = false; current.controller?.abort(); };
  }, [initialPage, resetKey]);
  const loadMore = useCallback(async () => {
    const current = state.current;
    if (!current?.active || current.loading || !current.hasMore || !enabled) return;
    current.loading = true; current.error = null;
    const controller = new AbortController();
    current.controller = controller;
    setSnapshot({ ...current });
    try {
      const result = await latest.current(current.page, { signal: controller.signal });
      if (!current.active) return;
      current.items = [...current.items, ...result.items];
      current.hasMore = result.hasMore;
      current.page++;
    } catch (error) {
      if (current.active) current.error = error;
    } finally {
      if (current.active) { current.loading = false; setSnapshot({ ...current }); }
    }
  }, [enabled, latest]);
  useEffect(() => {
    if (seen.visible && !snapshot.error && !snapshot.loading && snapshot.hasMore) void loadMore();
  }, [seen.visible, snapshot, loadMore]);
  return { ref: seen.ref, items: snapshot.items, loading: snapshot.loading, hasMore: snapshot.hasMore, error: snapshot.error, loadMore };
}
