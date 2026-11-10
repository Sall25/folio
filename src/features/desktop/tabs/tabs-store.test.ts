import { beforeEach, describe, expect, it, vi } from "vitest";

// The desktop tabs' logic: history per tab, open / close / reopen, pinning.
// Each test gets a fresh store (the module keeps its state).

type Store = typeof import("./tabs-store");
let store: Store;
let went: string[];

beforeEach(async () => {
  vi.resetModules();
  store = await import("./tabs-store");
  went = [];
  store.setTabNavigator((path) => went.push(path));
});

const paths = () => store.tabs.get().tabs.map((t) => t.path);
const active = () => {
  const s = store.tabs.get();
  return s.tabs.find((t) => t.id === s.activeId)!;
};

describe("desktop tabs", () => {
  it("starts with a pinned Home tab and the page it opened on", () => {
    store.tabs.init("/page/a");
    expect(paths()).toEqual(["/", "/page/a"]);
    expect(store.tabs.get().tabs[0].pinned).toBe(true);
    expect(active().path).toBe("/page/a");
  });

  it("keeps back / forward history per tab", () => {
    store.tabs.init("/page/a");
    store.tabs.record("/page/b", true);
    store.tabs.record("/page/c", true);
    store.tabs.back();
    expect(active().path).toBe("/page/b");
    expect(went.at(-1)).toBe("/page/b");
    store.tabs.forward();
    expect(active().path).toBe("/page/c");
    // A replace (a redirect) changes the address without history.
    store.tabs.record("/page/c?x=1", false);
    expect(active().back).toEqual(["/page/a", "/page/b"]);
  });

  it("a new navigation clears forward history", () => {
    store.tabs.init("/page/a");
    store.tabs.record("/page/b", true);
    store.tabs.back();
    store.tabs.record("/page/z", true);
    expect(active().forward).toEqual([]);
  });

  it("opens a tab after the active one and switches to it", () => {
    store.tabs.init("/page/a");
    store.tabs.open("/page/b");
    expect(paths()).toEqual(["/", "/page/a", "/page/b"]);
    expect(active().path).toBe("/page/b");
    expect(went.at(-1)).toBe("/page/b");
  });

  it("a background tab doesn't switch", () => {
    store.tabs.init("/page/a");
    store.tabs.open("/page/b", { background: true });
    expect(active().path).toBe("/page/a");
  });

  it("closing the active tab moves to its right neighbour, else the left", () => {
    store.tabs.init("/page/a");
    store.tabs.open("/page/b");
    store.tabs.open("/page/c");
    const b = store.tabs.get().tabs[2];
    store.tabs.activate(b.id);
    store.tabs.close(b.id);
    expect(active().path).toBe("/page/c");
    store.tabs.close(active().id);
    expect(active().path).toBe("/page/a");
  });

  it("reopens the last closed tab with its history", () => {
    store.tabs.init("/page/a");
    store.tabs.record("/page/b", true);
    store.tabs.close(active().id);
    store.tabs.reopenClosed();
    expect(active().path).toBe("/page/b");
    expect(active().back).toEqual(["/page/a"]);
  });

  it("closing the last tab leaves a Home tab", () => {
    store.tabs.init("/");
    store.tabs.close(active().id);
    expect(paths()).toEqual(["/"]);
    expect(went.at(-1)).toBe("/");
  });

  it("pinned tabs stay first", () => {
    store.tabs.init("/page/a");
    store.tabs.open("/page/b");
    store.tabs.togglePin(active().id);
    expect(paths()).toEqual(["/", "/page/b", "/page/a"]);
    // A new tab never lands among the pinned ones.
    store.tabs.activate(store.tabs.get().tabs[0].id);
    store.tabs.open("/page/c");
    expect(paths()).toEqual(["/", "/page/b", "/page/c", "/page/a"]);
  });

  it("close others keeps pinned tabs; close to the right too", () => {
    store.tabs.init("/page/a");
    store.tabs.open("/page/b");
    store.tabs.open("/page/c");
    const a = store.tabs.get().tabs[1];
    store.tabs.closeToTheRight(a.id);
    expect(paths()).toEqual(["/", "/page/a"]);
    store.tabs.open("/page/d");
    store.tabs.closeOthers(store.tabs.get().tabs[1].id);
    expect(paths()).toEqual(["/", "/page/a"]);
  });

  it("Ctrl+Tab cycles; Ctrl+9 goes to the last tab", () => {
    store.tabs.init("/page/a");
    store.tabs.open("/page/b");
    store.tabs.cycle(1);
    expect(active().path).toBe("/");
    store.tabs.select(9);
    expect(active().path).toBe("/page/b");
  });
});

describe("desktop tabs: coming back after a restart", () => {
  function memoryStorage(): Storage {
    const data = new Map<string, string>();
    return {
      get length() {
        return data.size;
      },
      clear: () => data.clear(),
      getItem: (k) => data.get(k) ?? null,
      key: (i) => [...data.keys()][i] ?? null,
      removeItem: (k) => void data.delete(k),
      setItem: (k, v) => void data.set(k, String(v)),
    };
  }

  async function restart() {
    vi.resetModules();
    store = await import("./tabs-store");
    went = [];
    store.setTabNavigator((path) => went.push(path));
  }

  it("brings back the tabs and the active one, even when the title bar reads them first", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    store.tabs.init("/");
    store.tabs.open("/page/a");
    store.tabs.open("/page/b");
    store.tabs.activate(store.tabs.get().tabs[1].id);

    await restart();
    // The title bar renders (and reads the tabs) before the sync starts.
    store.tabs.get();
    store.tabs.init("/");
    expect(paths()).toEqual(["/", "/page/a", "/page/b"]);
    expect(active().path).toBe("/page/a");
    expect(went).toEqual(["/page/a"]);
    vi.unstubAllGlobals();
  });

  it("with nothing saved: Home plus the page it opened on", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    await restart();
    store.tabs.get();
    store.tabs.init("/page/x");
    expect(paths()).toEqual(["/", "/page/x"]);
    vi.unstubAllGlobals();
  });
});
