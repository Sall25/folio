import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import type { DataSource, Page } from "src/types";

// The desktop app's offline features: every page kept offline by default,
// media saved on the computer, and the Markdown backup. The app's side
// (Tauri) is faked; what's tested is what the web app decides and sends it.

vi.mock("src/lib/desktop", () => ({ isDesktopApp: true }));

const invoked: { cmd: string; args?: Record<string, unknown> }[] = [];
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
    invoked.push({ cmd, args });
    if (cmd === "media_list") return [];
    if (cmd === "media_save") {
      return { url: args!.url, path: `/media/${invoked.length}`, size: 10 };
    }
    if (cmd === "backup_write") return (args!.files as unknown[]).length;
    return null;
  }),
  convertFileSrc: (path: string) => `asset://localhost${path}`,
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));
// Files just uploaded on this device (none here); the real module needs
// the Supabase client.
vi.mock("src/api/uploads", () => ({ localCopy: () => null }));
vi.mock("src/lib/offline-doc-cache", () => ({
  loadDocCache: vi.fn(async () => ({ update: null, fromServer: false })),
}));

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

const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubGlobal("navigator", { onLine: true });
  invoked.length = 0;
});

// ── Every page offline by default ───────────────────────────────────────────

describe("keeping pages offline (desktop)", () => {
  const choices = { favorites: false, pages: [], workspaces: [] };

  it("a workspace is kept by default", async () => {
    const { isWorkspaceKept } = await import("./offline-keep");
    expect(isWorkspaceKept(choices, "ws1")).toBe(true);
  });

  it("…unless turned off for it, which only affects that workspace", async () => {
    const { isWorkspaceKept } = await import("./offline-keep");
    const off = { ...choices, workspacesOff: ["ws1"] };
    expect(isWorkspaceKept(off, "ws1")).toBe(false);
    expect(isWorkspaceKept(off, "ws2")).toBe(true);
  });

  it("on the web, only when turned on", async () => {
    const { isWorkspaceKept } = await import("./offline-keep");
    expect(isWorkspaceKept(choices, "ws1", false)).toBe(false);
    expect(
      isWorkspaceKept({ ...choices, workspaces: ["ws1"] }, "ws1", false),
    ).toBe(true);
  });

  it("turning it off then on again keeps it", async () => {
    const keep = await import("./offline-keep");
    keep.setWorkspaceKept("me", "ws1", false);
    expect(keep.isWorkspaceKept(keep.readKeepChoices("me"), "ws1")).toBe(false);
    keep.setWorkspaceKept("me", "ws1", true);
    expect(keep.isWorkspaceKept(keep.readKeepChoices("me"), "ws1")).toBe(true);
  });
});

// ── Media on the computer ───────────────────────────────────────────────────

const UPLOAD =
  "https://abc.supabase.co/storage/v1/object/public/uploads/w/ws1/content";

describe("media saved on this computer", () => {
  it("saves web files, never video sites' pages", async () => {
    const { canSaveMedia } = await import("./media-cache");
    expect(canSaveMedia(`${UPLOAD}/clip.mp4`)).toBe(true);
    expect(canSaveMedia("https://example.com/photo.png")).toBe(true);
    for (const url of [
      "https://www.youtube.com/watch?v=x",
      "https://youtu.be/x",
      "https://vimeo.com/1",
      "https://www.loom.com/share/x",
      "https://drive.google.com/file/d/x/view",
      "blob:http://localhost/123",
      "",
      null,
    ]) {
      expect(canSaveMedia(url)).toBe(false);
    }
  });

  it("a saved file is shown from the computer, others from the web", async () => {
    const media = await import("./media-cache");
    expect(await media.saveMedia(`${UPLOAD}/a.png`)).toBe(true);
    const saved = invoked.find((c) => c.cmd === "media_save");
    expect(saved?.args).toEqual({ url: `${UPLOAD}/a.png` });
  });

  it("from a page downloaded for offline use: its images by default, not its videos or files", async () => {
    const media = await import("./media-cache");
    const ydoc = new Y.Doc();
    const root = ydoc.getXmlFragment("default");
    const image = new Y.XmlElement("image");
    image.setAttribute("src", `${UPLOAD}/a.png`);
    const video = new Y.XmlElement("video");
    video.setAttribute("src", `${UPLOAD}/b.mp4`);
    const file = new Y.XmlElement("file");
    file.setAttribute("files", [
      { url: `${UPLOAD}/c.pdf` },
    ] as unknown as string);
    const external = new Y.XmlElement("image");
    external.setAttribute("src", "https://example.com/not-ours.png");
    root.insert(0, [image, video, file, external]);

    media.saveMediaInDoc(ydoc);
    await settle();
    await settle();
    const urls = invoked
      .filter((c) => c.cmd === "media_save")
      .map((c) => c.args!.url);
    expect(urls).toEqual([`${UPLOAD}/a.png`]);
  });

  it("…and videos and files too once set to automatic", async () => {
    const media = await import("./media-cache");
    media.setMediaAuto("other", true);
    const ydoc = new Y.Doc();
    const video = new Y.XmlElement("video");
    video.setAttribute("src", `${UPLOAD}/b.mp4`);
    const file = new Y.XmlElement("file");
    file.setAttribute("files", [
      { url: `${UPLOAD}/c.pdf` },
    ] as unknown as string);
    ydoc.getXmlFragment("default").insert(0, [video, file]);

    media.saveMediaInDoc(ydoc);
    for (let i = 0; i < 5; i++) await settle();
    const urls = invoked
      .filter((c) => c.cmd === "media_save")
      .map((c) => c.args!.url);
    expect(urls.sort()).toEqual([`${UPLOAD}/b.mp4`, `${UPLOAD}/c.pdf`]);
  });

  it("nothing is saved automatically offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const media = await import("./media-cache");
    media.autoSaveMedia(`${UPLOAD}/a.png`, "image");
    await settle();
    expect(invoked.filter((c) => c.cmd === "media_save")).toEqual([]);
  });
});

// ── The backup ──────────────────────────────────────────────────────────────

function page(id: string, title: string, extra: Partial<Page> = {}): Page {
  return {
    id,
    title,
    parentId: null,
    sourceId: null,
    workspaceId: "ws1",
    category: "Private",
    deletedAt: null,
    createdAt: Number(id.replace(/\D/g, "") || 0),
    content: {
      type: "doc",
      content: [
        { type: "title", content: [{ type: "text", text: title }] },
        {
          type: "paragraph",
          content: [{ type: "text", text: `Text of ${title}` }],
        },
      ],
    },
    values: {},
    ...extra,
  } as Page;
}

async function files(pages: Page[], dataSources: DataSource[] = []) {
  const { buildBackupFiles } = await import("./desktop-backup");
  return buildBackupFiles({
    personId: "me",
    workspaceName: "Mon espace",
    pages,
    dataSources,
    untitled: "Untitled",
  });
}

describe("the Markdown backup", () => {
  it("one file per page, subpages in a folder named after their parent", async () => {
    const out = await files([
      page("p1", "Cours"),
      page("p2", "Leçon 1", { parentId: "p1" }),
      page("p3", "Exercice", { parentId: "p2" }),
    ]);
    expect(out.map((f) => f.path)).toEqual([
      "Cours.md",
      "Cours/Leçon 1.md",
      "Cours/Leçon 1/Exercice.md",
    ]);
    expect(out[0].content).toContain("# Cours");
    expect(out[0].content).toContain("Text of Cours");
  });

  it("leaves out the trash and templates", async () => {
    const out = await files([
      page("p1", "Kept"),
      page("p2", "Trashed", { deletedAt: 1 }),
      page("p3", "Template", { category: "Template" }),
    ]);
    expect(out.map((f) => f.path)).toEqual(["Kept.md"]);
  });

  it("names that clash get (2), (3)…", async () => {
    const out = await files([
      page("p1", "Notes"),
      page("p2", "Notes"),
      page("p3", "notes"),
    ]);
    expect(out.map((f) => f.path)).toEqual([
      "Notes.md",
      "Notes (2).md",
      "notes (3).md",
    ]);
  });

  it("names every system accepts", async () => {
    const { fsName } = await import("./desktop-backup");
    expect(fsName("a/b:c*d?", "x")).not.toMatch(/[/:*?]/);
    expect(fsName("Fin.", "x")).toBe("Fin");
    expect(fsName("CON", "x")).toBe("_CON");
    expect(fsName("   ", "Untitled")).toBe("Untitled");
  });

  it("a database: its rows as pages beside a CSV of the table", async () => {
    const source = {
      id: "s1",
      name: "Exercices",
      pageId: "p1",
      hostPageId: null,
      properties: [{ id: "title", name: "Name", config: { type: "title" } }],
    } as unknown as DataSource;
    const out = await files(
      [
        page("p1", "Suivi"),
        page("r1", "Exo 1", { sourceId: "s1" }),
        page("r2", "Exo 2", { sourceId: "s1" }),
      ],
      [source],
    );
    expect(out.map((f) => f.path).sort()).toEqual([
      "Suivi.md",
      "Suivi/Exercices.csv",
      "Suivi/Exo 1.md",
      "Suivi/Exo 2.md",
    ]);
  });

  it("is written into the chosen folder, under the workspace's name", async () => {
    const backup = await import("./desktop-backup");
    backup.updateBackupSettings("me", { folder: "C:\\Backups" });
    const count = await backup.runBackup({
      personId: "me",
      workspaceName: "Mon espace",
      pages: [page("p1", "Cours")],
      dataSources: [],
      untitled: "Untitled",
    });
    expect(count).toBe(1);
    const call = invoked.find((c) => c.cmd === "backup_write");
    expect(call?.args?.folder).toBe("C:\\Backups");
    expect(call?.args?.root).toBe("Mon espace");
    expect(backup.readBackupSettings("me").lastCount).toBe(1);
  });

  it("is due once the chosen time has passed, never without a folder", async () => {
    const { backupDue, BACKUP_INTERVAL_MS } = await import("./desktop-backup");
    const base = {
      enabled: true,
      folder: "/b",
      every: "day" as const,
      lastAt: 1_000,
      lastCount: 1,
    };
    expect(backupDue(base, 1_000 + BACKUP_INTERVAL_MS.day - 1)).toBe(false);
    expect(backupDue(base, 1_000 + BACKUP_INTERVAL_MS.day)).toBe(true);
    expect(backupDue({ ...base, lastAt: null }, 0)).toBe(true);
    expect(backupDue({ ...base, folder: null, lastAt: null }, 0)).toBe(false);
    expect(backupDue({ ...base, enabled: false, lastAt: null }, 0)).toBe(false);
  });
});
