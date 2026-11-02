import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KvValue, OfflineKv } from "./offline-kv";

// The desktop app's file store (fileKv) against an in-memory stand-in for
// Tauri's file system plugin: reads and writes, keys, clearing, and the
// one-time move of the browser's copies, unsent edits included.

const files = new Map<string, Uint8Array>();

vi.mock("@tauri-apps/plugin-fs", () => ({
  BaseDirectory: { AppLocalData: 1 },
  exists: async (p: string) =>
    files.has(p) ||
    [...files.keys()].some((k) => k.startsWith(`${p}/`)) ||
    dirs.has(p),
  mkdir: async (p: string) => {
    dirs.add(p);
  },
  writeFile: async (p: string, data: Uint8Array) => {
    files.set(p, data);
  },
  readFile: async (p: string) => {
    const f = files.get(p);
    if (!f) throw new Error("no file");
    return f;
  },
  remove: async (p: string) => {
    files.delete(p);
  },
  readDir: async (p: string) =>
    [...files.keys()]
      .filter(
        (k) => k.startsWith(`${p}/`) && !k.slice(p.length + 1).includes("/"),
      )
      .map((k) => ({ name: k.slice(p.length + 1), isFile: true })),
  stat: async (p: string) => ({ size: files.get(p)?.length ?? 0 }),
}));

const dirs = new Set<string>();

/** A stand-in for the browser's IndexedDB store. */
function memoryKv(
  initial: Record<string, KvValue>,
): OfflineKv & { data: Map<string, KvValue> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    get: async (k) => data.get(k),
    put: async (k, v) => void data.set(k, v),
    del: async (k) => void data.delete(k),
    keys: async () => [...data.keys()],
    clear: async () => data.clear(),
    size: async () => null,
  };
}

beforeEach(() => {
  files.clear();
  dirs.clear();
  vi.resetModules();
});

describe("offline copies as files (desktop app)", () => {
  it("writes, reads, lists and deletes", async () => {
    const { fileKv } = await import("./offline-kv");
    const kv = fileKv("offline-docs");
    await kv.put("doc:p1:a", new Uint8Array([1, 2, 3]));
    await kv.put("dirty:p1:a", true);
    expect(Array.from((await kv.get("doc:p1:a")) as Uint8Array)).toEqual([
      1, 2, 3,
    ]);
    expect(await kv.get("dirty:p1:a")).toBe(true);
    expect((await kv.keys()).sort()).toEqual(["dirty:p1:a", "doc:p1:a"]);
    await kv.del("dirty:p1:a");
    expect(await kv.get("dirty:p1:a")).toBeUndefined();
    expect(await kv.size()).toBe(4); // tag byte + 3
  });

  it("moves the browser's copies over once, unsent edits included", async () => {
    const { fileKv } = await import("./offline-kv");
    const browser = memoryKv({
      "doc:p1:a": new Uint8Array([9, 9]),
      "dirty:p1:a": true,
      "seen:p1:a": 123,
    });
    const kv = fileKv("offline-docs", browser);
    expect(await kv.get("dirty:p1:a")).toBe(true);
    expect(Array.from((await kv.get("doc:p1:a")) as Uint8Array)).toEqual([
      9, 9,
    ]);
    expect(await kv.get("seen:p1:a")).toBe(123);
    // The browser store is emptied, and nothing moves a second time.
    expect(browser.data.size).toBe(0);
    browser.data.set("doc:p1:late", new Uint8Array([1]));
    const again = fileKv("offline-docs", browser);
    expect(await again.get("doc:p1:late")).toBeUndefined();
  });

  it("clear removes the copies but not the move marker", async () => {
    const { fileKv } = await import("./offline-kv");
    const kv = fileKv("offline-docs", memoryKv({}));
    await kv.put("doc:p1:a", new Uint8Array([1]));
    await kv.clear();
    expect(await kv.keys()).toEqual([]);
    expect(files.has("offline-docs/.moved-from-browser")).toBe(true);
  });
});
