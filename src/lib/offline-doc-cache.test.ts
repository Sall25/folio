import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KvValue } from "./offline-kv";

// Which page copies may open a page before the server answers (desktop
// app): only copies of the server's version. The mark that says so must be
// written by a save after a sync, survive later saves, and go away with the
// copy.

const data = new Map<string, KvValue>();

vi.mock("src/lib/offline-kv", () => ({
  offlineKv: () => ({
    get: async (k: string) => data.get(k),
    put: async (k: string, v: KvValue) => void data.set(k, v),
    del: async (k: string) => void data.delete(k),
    keys: async () => [...data.keys()],
    clear: async () => data.clear(),
    size: async () => null,
  }),
}));
vi.mock("src/lib/desktop", () => ({ isDesktopApp: true }));

const flush = () => new Promise((r) => setTimeout(r, 0));
const bytes = new Uint8Array([1, 2, 3]);

beforeEach(() => data.clear());

describe("opening a page from its copy at once", () => {
  it("a copy saved after a sync with the server is marked", async () => {
    const { saveDocCache, loadDocCache } = await import("./offline-doc-cache");
    saveDocCache("me", "p1", bytes, { fromServer: true });
    await flush();
    expect((await loadDocCache("me", "p1")).fromServer).toBe(true);
  });

  it("a later save without the mark keeps it", async () => {
    const { saveDocCache, loadDocCache } = await import("./offline-doc-cache");
    saveDocCache("me", "p1", bytes, { fromServer: true });
    saveDocCache("me", "p1", new Uint8Array([4]));
    await flush();
    const copy = await loadDocCache("me", "p1");
    expect(copy.fromServer).toBe(true);
    expect(Array.from(copy.update!)).toEqual([4]);
  });

  it("older copies, and pages created here, aren't marked", async () => {
    const { saveDocCache, loadDocCache } = await import("./offline-doc-cache");
    saveDocCache("me", "p1", bytes);
    await flush();
    expect((await loadDocCache("me", "p1")).fromServer).toBe(false);
    expect((await loadDocCache("me", "none")).fromServer).toBe(false);
  });

  it("opens at once only in the desktop app, from a marked copy", async () => {
    const { opensFromCopyAtOnce } = await import("./offline-doc-cache");
    const marked = { update: bytes, dirty: false, fromServer: true };
    expect(opensFromCopyAtOnce(marked, true)).toBe(true);
    expect(opensFromCopyAtOnce(marked, false)).toBe(false);
    expect(
      opensFromCopyAtOnce({ ...marked, fromServer: false }, true),
    ).toBe(false);
    expect(opensFromCopyAtOnce({ ...marked, update: null }, true)).toBe(false);
  });

  it("dropping a copy drops its mark; keeping unsent edits keeps it", async () => {
    const { saveDocCache, markDocDirty, pruneDocCache, clearOfflineDocCache } =
      await import("./offline-doc-cache");
    saveDocCache("me", "old", bytes, { fromServer: true });
    await flush();
    await new Promise((r) => setTimeout(r, 5));
    saveDocCache("me", "new", bytes, { fromServer: true });
    await flush();
    expect(await pruneDocCache("me", 1)).toBe(1);
    expect(data.has("synced:me:old")).toBe(false);
    expect(data.has("synced:me:new")).toBe(true);

    markDocDirty("me", "new");
    await flush();
    await clearOfflineDocCache(() => true);
    expect(data.has("synced:me:new")).toBe(true);
    expect(data.has("doc:me:new")).toBe(true);
  });
});
