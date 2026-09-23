import { useSyncExternalStore } from "react";

// A shared clock for render-time comparisons ("active in the last 10 min",
// relative labels). Reading Date.now() during render is impure — this reads
// it outside render, on an interval, and hands components a stable snapshot.
// One interval for the whole app, started on first subscriber, stopped when
// the last one unmounts.

const TICK_MS = 30_000;

let now = Date.now();
let timer: number | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (timer === null) {
    now = Date.now();
    timer = window.setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => now;

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
