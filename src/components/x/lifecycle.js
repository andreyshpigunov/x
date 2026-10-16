// Internal owner for delayed work. Disposal settles waits without running callbacks.
export function createLifecycle() {
  const pending = new Map();
  let active = true;
  return {
    get active() { return active; },
    wait(ms) {
      if (!active) return Promise.resolve(false);
      return new Promise(resolve => {
        const timer = setTimeout(() => { pending.delete(timer); resolve(true); }, ms);
        pending.set(timer, () => resolve(false));
      });
    },
    dispose() {
      active = false;
      for (const [timer, cancel] of pending) { clearTimeout(timer); cancel(); }
      pending.clear();
    }
  };
}
