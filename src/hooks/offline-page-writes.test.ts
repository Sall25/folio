import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MutationObserver,
  QueryClient,
  dehydrate,
  hydrate,
  onlineManager,
} from "@tanstack/react-query";
import type { Page } from "src/types";

// Page writes without a connection: making a page, changing it, moving it
// to the trash and back. Each must show at once, wait for the connection,
// reach the server in the right order when it's back — even after a
// reload — and never be lost. These run the hooks' real options on a
// QueryClient, with the server faked.

// ── The fake server and browser ─────────────────────────────────────────────

const server = {
  online: true,
  pages: new Set<string>(),
  calls: [] as string[],
};

// What the app really gets with no connection: Supabase returns the
// browser's failure as an error, which http() wraps in a plain Error.
const offlineError = () =>
  new Error("Error POST /pages: TypeError: Failed to fetch ()");

vi.mock("src/api/pages", () => ({
  createPage: vi.fn(async (page: Page) => {
    server.calls.push(`create ${page.id} "${page.title}"`);
    if (!server.online) throw offlineError();
    if (server.pages.has(page.id)) throw new Error("duplicate key value");
    server.pages.add(page.id);
    return page;
  }),
  patchPage: vi.fn(async (id: string, patch: Partial<Page>) => {
    server.calls.push(`patch ${id} ${JSON.stringify(patch)}`);
    if (!server.online) throw offlineError();
    if (!server.pages.has(id)) throw new Error("404 page not found");
    return { id, ...patch } as Page;
  }),
}));

vi.mock("src/api/pages-trash", () => ({
  trashPage: vi.fn(async (id: string) => {
    server.calls.push(`trash ${id}`);
    if (!server.online) throw offlineError();
    if (!server.pages.has(id)) throw new Error("404 page not found");
  }),
  restorePage: vi.fn(async (id: string) => {
    server.calls.push(`restore ${id}`);
    if (!server.online) throw offlineError();
  }),
  deletePagePermanently: vi.fn(),
  emptyTrash: vi.fn(),
}));

// The React side of the hooks' modules isn't used here.
vi.mock("src/features/shell/toast", () => ({ useToast: () => ({}) }));
vi.mock("src/hooks/use-current-space", () => ({}));
vi.mock("src/hooks/use-workspaces", () => ({}));
vi.mock("src/hooks/use-session", () => ({}));
vi.mock("src/hooks/use-pages", () => ({}));

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

function goOffline() {
  server.online = false;
  vi.stubGlobal("navigator", { onLine: false });
  onlineManager.setOnline(false);
}

function goOnline() {
  server.online = true;
  vi.stubGlobal("navigator", { onLine: true });
  onlineManager.setOnline(true);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const LIST = ["pages", "list", "ws1"];

function page(id: string, extra: Partial<Page> = {}): Page {
  return {
    id,
    title: "",
    parentId: null,
    workspaceId: "ws1",
    deletedAt: null,
    ...extra,
  } as Page;
}

const settle = () => new Promise((r) => setTimeout(r, 0));

async function load() {
  const create = await import("./use-create-page");
  const patch = await import("./use-patch-page");
  const trash = await import("./use-trash-page");
  const restore = await import("./use-trash");
  const local = await import("src/lib/local-pages");
  const writes = await import("src/lib/page-writes");
  const { patchPage } = await import("src/api/pages");
  return { create, patch, trash, restore, local, writes, patchPage };
}

let qc: QueryClient;
let m: Awaited<ReturnType<typeof load>>;

/** A client like App.tsx's: the page list cached, page writes' defaults. */
function newClient(pages: Page[] = []) {
  const client = new QueryClient();
  // Mounted, as the provider does: paused writes resume when back online.
  client.mount();
  m.writes.setPageWriteDefaults(client);
  client.setQueryData(LIST, pages);
  return client;
}

const listed = (client = qc) => client.getQueryData<Page[]>(LIST) ?? [];
const pausedCount = (client = qc) =>
  client
    .getMutationCache()
    .getAll()
    .filter((x) => x.state.isPaused).length;

function createPage(p: Page) {
  return new MutationObserver(
    qc,
    m.create.createPageMutationOptions(qc),
  ).mutate(p);
}

function patchPage(id: string, patch: Partial<Page>) {
  return new MutationObserver(
    qc,
    m.patch.patchPageMutationOptions(qc, ({ id, patch }) =>
      m.patchPage(id, patch),
    ),
  ).mutate({ id, patch });
}

function trashPage(pageId: string, ids?: string[]) {
  return new MutationObserver(
    qc,
    m.trash.trashPageMutationOptions(qc),
  ).mutate({ pageId, workspaceId: "ws1", ids });
}

function restorePage(pageId: string) {
  return new MutationObserver(
    qc,
    m.restore.restorePageMutationOptions(qc, () => {}),
  ).mutate(pageId);
}

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal("localStorage", memoryStorage());
  server.pages.clear();
  server.calls = [];
  goOnline();
  m = await load();
  qc = newClient();
});

afterEach(() => {
  qc.unmount();
  qc.clear();
  vi.unstubAllGlobals();
  onlineManager.setOnline(true);
});

// ── New pages ───────────────────────────────────────────────────────────────

describe("a new page", () => {
  it("online: is created on the server and leaves the outbox", async () => {
    await createPage(page("p1", { title: "Hello" }));
    expect(server.pages.has("p1")).toBe(true);
    expect(m.local.isLocalPage("p1")).toBe(false);
    expect(listed().map((p) => p.id)).toEqual(["p1"]);
  });

  it("offline: opens at once (resolves), shows in the list, waits in the outbox", async () => {
    goOffline();
    const saved = await createPage(page("p1"));
    expect(saved.id).toBe("p1");
    expect(listed().map((p) => p.id)).toEqual(["p1"]);
    expect(m.local.isLocalPage("p1")).toBe(true);
    expect(pausedCount()).toBe(0);
  });

  it("offline: isn't held behind a rename waiting for the connection", async () => {
    qc.setQueryData(LIST, [page("old")]);
    server.pages.add("old");
    goOffline();
    void patchPage("old", { title: "Renamed offline" });
    await settle();
    expect(pausedCount()).toBe(1);

    const saved = await Promise.race([
      createPage(page("p1")),
      new Promise((r) => setTimeout(() => r("stuck"), 200)),
    ]);
    expect(saved).not.toBe("stuck");
  });

  it("already on the server (sent by a change to it meanwhile): counts as created", async () => {
    m.local.addLocalPage(page("p1"));
    server.pages.add("p1");
    const saved = await createPage(page("p1"));
    expect(saved.id).toBe("p1");
    expect(listed().map((p) => p.id)).toEqual(["p1"]);
    expect(m.local.isLocalPage("p1")).toBe(false);
  });
});

// ── Changes to pages ────────────────────────────────────────────────────────

describe("a change to a page", () => {
  it("offline: shows at once, waits, and is sent when the connection is back", async () => {
    qc.setQueryData(LIST, [page("p1", { title: "Old" })]);
    server.pages.add("p1");
    goOffline();
    const done = patchPage("p1", { title: "New" });
    await settle();
    expect(listed()[0].title).toBe("New");
    expect(pausedCount()).toBe(1);

    goOnline();
    await done;
    expect(server.calls.at(-1)).toBe('patch p1 {"title":"New"}');
  });

  it("to a page made offline: goes into the waiting copy, and the page is sent before the change", async () => {
    goOffline();
    await createPage(page("p1"));
    const done = patchPage("p1", { title: "Typed offline" });
    await settle();
    expect(m.local.localPages()[0].title).toBe("Typed offline");

    server.calls = [];
    goOnline();
    await done;
    expect(server.calls).toEqual([
      'create p1 "Typed offline"',
      'patch p1 {"title":"Typed offline"}',
    ]);
    expect(m.local.isLocalPage("p1")).toBe(false);
  });

  it("keeps their order: two renames reach the server oldest first", async () => {
    qc.setQueryData(LIST, [page("p1")]);
    server.pages.add("p1");
    goOffline();
    const a = patchPage("p1", { title: "Good" });
    const b = patchPage("p1", { title: "Good morning" });
    await settle();
    goOnline();
    await Promise.all([a, b]);
    expect(server.calls.filter((c) => c.startsWith("patch"))).toEqual([
      'patch p1 {"title":"Good"}',
      'patch p1 {"title":"Good morning"}',
    ]);
  });
});

// ── The trash ───────────────────────────────────────────────────────────────

describe("the trash", () => {
  beforeEach(() => {
    qc.setQueryData(LIST, [
      page("a"),
      page("a1", { parentId: "a" }),
      page("a1x", { parentId: "a1" }),
      page("b"),
    ]);
    ["a", "a1", "a1x", "b"].forEach((id) => server.pages.add(id));
  });

  const trashed = () =>
    listed()
      .filter((p) => p.deletedAt != null)
      .map((p) => p.id);

  it("finds a page and every page inside it from the cache", async () => {
    const { cachedSubtree } = await import("src/lib/page-trash-cache");
    expect(cachedSubtree(qc, "a")).toEqual(["a", "a1", "a1x"]);
  });

  it("offline: the page and its subpages go to the trash at once, sent when back", async () => {
    const { cachedSubtree } = await import("src/lib/page-trash-cache");
    goOffline();
    const done = trashPage("a", cachedSubtree(qc, "a"));
    await settle();
    expect(trashed()).toEqual(["a", "a1", "a1x"]);
    expect(pausedCount()).toBe(1);

    goOnline();
    await done;
    expect(server.calls.at(-1)).toBe("trash a");
  });

  it("offline: restoring brings them back at once, sent after the trash", async () => {
    const { cachedSubtree } = await import("src/lib/page-trash-cache");
    goOffline();
    const t = trashPage("a", cachedSubtree(qc, "a"));
    const r = restorePage("a");
    await settle();
    expect(trashed()).toEqual([]);

    goOnline();
    await Promise.all([t, r]);
    expect(server.calls.filter((c) => /^(trash|restore)/.test(c))).toEqual([
      "trash a",
      "restore a",
    ]);
  });

  it("a page made offline inside it is sent first, so it's trashed too", async () => {
    goOffline();
    await createPage(page("new", { parentId: "a" }));
    const { cachedSubtree } = await import("src/lib/page-trash-cache");
    const done = trashPage("a", cachedSubtree(qc, "a"));
    await settle();

    server.calls = [];
    goOnline();
    await done;
    expect(server.calls.indexOf('create new ""')).toBeLessThan(
      server.calls.indexOf("trash a"),
    );
  });

  it("a failed trash puts the pages back", async () => {
    server.pages.delete("b"); // the server no longer has it
    await expect(trashPage("b")).rejects.toThrow();
    expect(trashed()).toEqual([]);
  });
});

// ── After a reload ──────────────────────────────────────────────────────────

describe("writes queued offline, after a reload", () => {
  it("are saved with the cache and sent when the connection is back", async () => {
    qc.setQueryData(LIST, [page("p1"), page("p2")]);
    server.pages.add("p1");
    server.pages.add("p2");
    goOffline();
    void patchPage("p1", { title: "Renamed" });
    void trashPage("p2", ["p2"]);
    await settle();

    // What App.tsx saves: paused page writes.
    const saved = JSON.parse(
      JSON.stringify(
        dehydrate(qc, {
          shouldDehydrateMutation: (x) =>
            x.state.isPaused && x.options.mutationKey?.[0] === "pages",
        }),
      ),
    );
    expect(saved.mutations).toHaveLength(2);

    // The reload: a new client with App.tsx's defaults, the saved writes.
    qc.unmount();
    qc.clear();
    const after = newClient();
    hydrate(after, saved);
    server.calls = [];
    goOnline();
    await after.resumePausedMutations();
    await settle();
    expect(server.calls).toEqual(['patch p1 {"title":"Renamed"}', "trash p2"]);
    after.unmount();
    after.clear();
  });
});

// ── The browser says online, the server can't be reached ────────────────────

describe("no connection while the browser still says online (common on Windows, the desktop app)", () => {
  /** The server unreachable, navigator.onLine and React Query still true. */
  function serverUnreachable() {
    server.online = false;
    vi.stubGlobal("navigator", { onLine: true });
  }

  it("a new page still opens at once and waits in the outbox", async () => {
    serverUnreachable();
    const saved = await createPage(page("p1"));
    expect(saved.id).toBe("p1");
    expect(listed().map((p) => p.id)).toEqual(["p1"]);
    expect(m.local.isLocalPage("p1")).toBe(true);
  });

  it("a rename isn't undone: it waits, and is sent once the server answers", async () => {
    qc.setQueryData(LIST, [page("p1", { title: "Old" })]);
    server.pages.add("p1");
    serverUnreachable();
    const done = patchPage("p1", { title: "New" });
    // The first try fails, React Query is told we're offline, it waits.
    await new Promise((r) => setTimeout(r, 1500));
    expect(onlineManager.isOnline()).toBe(false);
    expect(pausedCount()).toBe(1);
    expect(listed()[0].title).toBe("New");

    goOnline();
    await done;
    expect(server.calls.at(-1)).toBe('patch p1 {"title":"New"}');
    expect(listed()[0].title).toBe("New");
  });

  it("moving to the trash isn't undone either", async () => {
    qc.setQueryData(LIST, [page("p1")]);
    server.pages.add("p1");
    serverUnreachable();
    const done = trashPage("p1", ["p1"]);
    await new Promise((r) => setTimeout(r, 1500));
    expect(pausedCount()).toBe(1);
    expect(listed()[0].deletedAt).not.toBeNull();

    goOnline();
    await done;
    expect(server.calls.at(-1)).toBe("trash p1");
  });

  it("knows a lost connection from a refusal", async () => {
    const { isNetworkError } = await import("src/lib/connectivity");
    expect(isNetworkError(offlineError())).toBe(true);
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkError(new Error("Load failed"))).toBe(true);
    expect(isNetworkError({ message: "TypeError: NetworkError when attempting to fetch resource." })).toBe(true);
    expect(isNetworkError(new Error("duplicate key value"))).toBe(false);
    expect(isNetworkError(new Error("new row violates row-level security policy"))).toBe(false);
  });
});

