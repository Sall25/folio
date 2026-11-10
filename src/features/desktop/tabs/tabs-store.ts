import { useSyncExternalStore } from "react";

// The desktop app's page tabs. Each tab is an address in the app (a page,
// Home, Inbox, a chat…) with its own back / forward history. One router
// shows the active tab; switching tabs moves the router to that tab's
// address (desktop-tabs-sync.tsx keeps the two in step). Saved on this
// device, so the tabs come back when the app reopens.

export interface Tab {
  id: string;
  path: string;
  pinned: boolean;
  back: string[];
  forward: string[];
}

interface State {
  tabs: Tab[];
  activeId: string;
}

const STORAGE_KEY = "folio.desktop.tabs.v1";
const HISTORY_LIMIT = 50;
const CLOSED_LIMIT = 20;
const HOME = "/";

let state: State | null = null;
/** The tabs came from the last session (load), not made fresh. */
let restored = false;
/** init has run. Separate from `state`: the title bar reads the tabs
 *  (useTabs → current) before the sync starts them, which used to create
 *  fresh tabs first — init then saw tabs already there, kept them, and
 *  saved them over the last session's, so the tabs never came back. */
let started = false;
const closed: Tab[] = [];
const listeners = new Set<() => void>();

/** Moves the router to an address without touching tab history; set by
 *  desktop-tabs-sync.tsx. */
let go: (path: string) => void = () => {};
export function setTabNavigator(fn: (path: string) => void) {
  go = fn;
}

const newId = () => Math.random().toString(36).slice(2, 10);
const makeTab = (path: string, pinned = false): Tab => ({
  id: newId(),
  path,
  pinned,
  back: [],
  forward: [],
});

function load(): State | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as State;
    if (!Array.isArray(parsed.tabs) || parsed.tabs.length === 0) return null;
    const tabs = parsed.tabs
      .filter((t) => t && typeof t.path === "string")
      .map((t) => ({
        id: t.id || newId(),
        path: t.path,
        pinned: !!t.pinned,
        back: Array.isArray(t.back) ? t.back.slice(-HISTORY_LIMIT) : [],
        forward: Array.isArray(t.forward)
          ? t.forward.slice(0, HISTORY_LIMIT)
          : [],
      }));
    if (!tabs.length) return null;
    const activeId = tabs.some((t) => t.id === parsed.activeId)
      ? parsed.activeId
      : tabs[0].id;
    return { tabs, activeId };
  } catch {
    return null;
  }
}

function save() {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: tabs just won't come back next time.
  }
}

function set(next: State) {
  state = next;
  save();
  listeners.forEach((l) => l());
}

function current(): State {
  if (!state) {
    // The last session's tabs, whoever asks first.
    const saved = load();
    restored = !!saved;
    state = saved ?? { tabs: [makeTab(HOME, true)], activeId: "" };
  }
  if (!state.activeId) state.activeId = state.tabs[0].id;
  return state;
}

/** Pinned tabs first, in their order, then the others. */
function ordered(tabs: Tab[]): Tab[] {
  return [...tabs.filter((t) => t.pinned), ...tabs.filter((t) => !t.pinned)];
}

function activeTab(s = current()): Tab {
  return s.tabs.find((t) => t.id === s.activeId) ?? s.tabs[0];
}

function activate(id: string) {
  const s = current();
  const tab = s.tabs.find((t) => t.id === id);
  if (!tab) return;
  if (id !== s.activeId) set({ ...s, activeId: id });
  go(tab.path);
}

export const tabs = {
  get: current,

  /** At start: the saved tabs (going to the active one), or a pinned Home
   *  tab plus the address the app opened on. */
  init(startPath: string) {
    if (started) return;
    started = true;
    const s = current();
    if (restored) {
      const path = activeTab(s).path;
      if (path !== startPath) go(path);
      return;
    }
    if (startPath !== HOME) {
      const tab = makeTab(startPath);
      set({ tabs: [...s.tabs, tab], activeId: tab.id });
    } else {
      set(s);
    }
  },

  /** The router moved inside the active tab (a link, the sidebar…): a push
   *  adds to its back history, a replace just updates its address. */
  record(path: string, push: boolean) {
    const s = current();
    const tab = activeTab(s);
    if (tab.path === path) return;
    const next: Tab = push
      ? {
          ...tab,
          path,
          back: [...tab.back, tab.path].slice(-HISTORY_LIMIT),
          forward: [],
        }
      : { ...tab, path };
    set({ ...s, tabs: s.tabs.map((t) => (t.id === tab.id ? next : t)) });
  },

  activate,

  open(path = HOME, { background = false }: { background?: boolean } = {}) {
    const s = current();
    const tab = makeTab(path);
    // Right after the active tab, like a browser.
    const at = s.tabs.findIndex((t) => t.id === s.activeId);
    const list = [...s.tabs];
    list.splice(
      Math.max(at + 1, s.tabs.filter((t) => t.pinned).length),
      0,
      tab,
    );
    set({ ...s, tabs: ordered(list) });
    if (!background) activate(tab.id);
  },

  close(id: string) {
    const s = current();
    const index = s.tabs.findIndex((t) => t.id === id);
    if (index === -1) return;
    closed.push(s.tabs[index]);
    if (closed.length > CLOSED_LIMIT) closed.shift();
    const rest = s.tabs.filter((t) => t.id !== id);
    if (rest.length === 0) {
      const home = makeTab(HOME);
      set({ tabs: [home], activeId: home.id });
      go(HOME);
      return;
    }
    if (id !== s.activeId) {
      set({ ...s, tabs: rest });
      return;
    }
    // The one to its right, else to its left.
    const nextActive = rest[Math.min(index, rest.length - 1)];
    set({ tabs: rest, activeId: nextActive.id });
    go(nextActive.path);
  },

  closeOthers(id: string) {
    const s = current();
    const keep = s.tabs.filter((t) => t.id === id || t.pinned);
    closed.push(...s.tabs.filter((t) => !keep.includes(t)));
    set({ tabs: keep, activeId: id });
    go(keep.find((t) => t.id === id)!.path);
  },

  closeToTheRight(id: string) {
    const s = current();
    const index = s.tabs.findIndex((t) => t.id === id);
    const keep = s.tabs.filter((t, i) => i <= index || t.pinned);
    closed.push(...s.tabs.filter((t) => !keep.includes(t)));
    const activeKept = keep.some((t) => t.id === s.activeId);
    set({ tabs: keep, activeId: activeKept ? s.activeId : id });
    if (!activeKept) go(keep.find((t) => t.id === id)!.path);
  },

  reopenClosed() {
    const tab = closed.pop();
    if (!tab) return;
    const s = current();
    const restored = { ...tab, id: newId(), pinned: false };
    set({ tabs: ordered([...s.tabs, restored]), activeId: restored.id });
    go(restored.path);
  },

  duplicate(id: string) {
    const s = current();
    const tab = s.tabs.find((t) => t.id === id);
    if (!tab) return;
    const copy = { ...tab, id: newId(), pinned: false };
    const list = [...s.tabs];
    list.splice(s.tabs.indexOf(tab) + 1, 0, copy);
    set({ ...s, tabs: ordered(list) });
    activate(copy.id);
  },

  togglePin(id: string) {
    const s = current();
    const list = s.tabs.map((t) =>
      t.id === id ? { ...t, pinned: !t.pinned } : t,
    );
    set({ ...s, tabs: ordered(list) });
  },

  /** Drag to reorder: a tab stays within its group (pinned or not). */
  move(id: string, toIndex: number) {
    const s = current();
    const tab = s.tabs.find((t) => t.id === id);
    if (!tab) return;
    const list = s.tabs.filter((t) => t.id !== id);
    list.splice(Math.max(0, Math.min(toIndex, list.length)), 0, tab);
    set({ ...s, tabs: ordered(list) });
  },

  /** Ctrl+Tab / Ctrl+Shift+Tab. */
  cycle(step: 1 | -1) {
    const s = current();
    const index = s.tabs.findIndex((t) => t.id === s.activeId);
    const next = s.tabs[(index + step + s.tabs.length) % s.tabs.length];
    activate(next.id);
  },

  /** Ctrl+1…8: that tab; Ctrl+9: the last one. */
  select(n: number) {
    const s = current();
    const tab = n >= 9 ? s.tabs[s.tabs.length - 1] : s.tabs[n - 1];
    if (tab) activate(tab.id);
  },

  back() {
    const s = current();
    const tab = activeTab(s);
    const to = tab.back[tab.back.length - 1];
    if (to == null) return;
    const next = {
      ...tab,
      path: to,
      back: tab.back.slice(0, -1),
      forward: [tab.path, ...tab.forward].slice(0, HISTORY_LIMIT),
    };
    set({ ...s, tabs: s.tabs.map((t) => (t.id === tab.id ? next : t)) });
    go(to);
  },

  forward() {
    const s = current();
    const tab = activeTab(s);
    const to = tab.forward[0];
    if (to == null) return;
    const next = {
      ...tab,
      path: to,
      back: [...tab.back, tab.path].slice(-HISTORY_LIMIT),
      forward: tab.forward.slice(1),
    };
    set({ ...s, tabs: s.tabs.map((t) => (t.id === tab.id ? next : t)) });
    go(to);
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The tabs and the active one, for the title bar. */
export function useTabs(): State {
  return useSyncExternalStore(subscribe, current);
}
