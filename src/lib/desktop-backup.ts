import { useSyncExternalStore } from "react";
import * as Y from "yjs";
import { yXmlFragmentToProsemirrorJSON } from "@tiptap/y-tiptap";
import type { JSONContent } from "@tiptap/core";
import type { DataSource, Page } from "src/types";
import { isDesktopApp } from "src/lib/desktop";
import { loadDocCache } from "src/lib/offline-doc-cache";
import { safeFileName } from "src/lib/export-utils";

// Desktop app: the workspace backed up as Markdown files in a folder on this
// computer, on a schedule (DesktopBackup) or with "Back up now" (My
// settings). src-tauri/src/backup.rs writes the files.
//
// Layout, in <folder>/<workspace name>/:
//   Page.md            each page, its title as the heading
//   Page/              its subpages, the same way
//   Page/Database.csv  a database's table, next to its rows' pages
// Names that clash in a folder get " (2)", " (3)"…
//
// A page's text comes from its copy on this computer when there is one
// (edits made offline included), otherwise from the pages list — so a
// backup needs no connection. Images and files stay as links.
//
// Settings are per person, on this computer (localStorage).

export type BackupEvery = "hour" | "day" | "week";

export interface BackupSettings {
  enabled: boolean;
  folder: string | null;
  every: BackupEvery;
  lastAt: number | null;
  lastCount: number | null;
}

export const BACKUP_INTERVAL_MS: Record<BackupEvery, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
};

const DEFAULTS: BackupSettings = {
  enabled: false,
  folder: null,
  every: "day",
  lastAt: null,
  lastCount: null,
};

const keyFor = (personId: string) => `folio-backup:${personId}`;
const cache = new Map<string, { raw: string | null; value: BackupSettings }>();
const listeners = new Set<() => void>();

export function readBackupSettings(personId: string): BackupSettings {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(keyFor(personId));
  } catch {
    /* storage blocked */
  }
  const hit = cache.get(personId);
  if (hit && hit.raw === raw) return hit.value;
  let value = DEFAULTS;
  try {
    if (raw) value = { ...DEFAULTS, ...(JSON.parse(raw) as object) };
  } catch {
    /* unreadable: the defaults */
  }
  cache.set(personId, { raw, value });
  return value;
}

export function updateBackupSettings(
  personId: string,
  patch: Partial<BackupSettings>,
) {
  const next = { ...readBackupSettings(personId), ...patch };
  try {
    localStorage.setItem(keyFor(personId), JSON.stringify(next));
  } catch {
    /* storage blocked: lasts until reload */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useBackupSettings(personId: string | null): BackupSettings {
  return useSyncExternalStore(
    subscribe,
    () => (personId ? readBackupSettings(personId) : DEFAULTS),
    () => DEFAULTS,
  );
}

const core = () => import("@tauri-apps/api/core");

/** Asks for a folder. Resolves with its path, or null if cancelled. */
export async function pickBackupFolder(): Promise<string | null> {
  if (!isDesktopApp) return null;
  const { invoke } = await core();
  return invoke<string | null>("backup_pick_folder");
}

export async function openBackupFolder(folder: string): Promise<void> {
  if (!isDesktopApp) return;
  const { invoke } = await core();
  await invoke("backup_open_folder", { folder });
}

// ── Building the files ──────────────────────────────────────────────────────

async function pageContent(
  personId: string,
  page: Page,
): Promise<JSONContent | null> {
  const { update } = await loadDocCache(personId, page.id);
  if (update) {
    try {
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, update);
      const json = yXmlFragmentToProsemirrorJSON(
        ydoc.getXmlFragment("default"),
      ) as JSONContent;
      ydoc.destroy();
      if (json.content?.length) return json;
    } catch {
      /* unreadable copy: the pages list's */
    }
  }
  return page.content ?? null;
}

/** A file or folder name every system accepts: safeFileName, and no
 *  trailing dot or space or reserved name (Windows). */
export function fsName(title: string, fallback: string): string {
  const name = safeFileName(title, fallback).replace(/[. ]+$/, "") || fallback;
  return /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(name)
    ? `_${name}`
    : name;
}

type Serializers = {
  contentToMarkdown: (doc: JSONContent) => string;
  toCsv: typeof import("src/features/database/utils/csv-export").toCsv;
};

/** The page as Markdown, starting with its title. */
function pageMarkdown(
  { contentToMarkdown }: Serializers,
  page: Page,
  content: JSONContent | null,
  untitled: string,
) {
  const body = content ? contentToMarkdown(content) : "";
  // The document's own title node is its first heading; add one when the
  // copy has none (an empty page).
  return body.startsWith("# ")
    ? body
    : `# ${page.title || untitled}\n\n${body}`;
}

export interface BackupFile {
  path: string;
  content: string;
}

export interface BackupInput {
  personId: string;
  workspaceName: string;
  /** Every page this person can see in the workspace, rows included. */
  pages: Page[];
  dataSources: DataSource[];
  untitled: string;
}

/** The backup's files (exported for desktop-offline.test.ts). */
export async function buildBackupFiles({
  personId,
  pages,
  dataSources,
  untitled,
}: BackupInput): Promise<BackupFile[]> {
  // Loaded on demand: only people who back up pay for them.
  const [{ contentToMarkdown }, { toCsv }] = await Promise.all([
    import("src/lib/markdown/content-to-markdown"),
    import("src/features/database/utils/csv-export"),
  ]);
  const serializers: Serializers = { contentToMarkdown, toCsv };
  const live = pages.filter(
    (p) => p.deletedAt == null && p.category !== "Template",
  );
  const byId = new Map(live.map((p) => [p.id, p]));
  const sourceById = new Map(dataSources.map((s) => [s.id, s]));

  // Where each page sits: its parent page, or for a row its database's page.
  const parentOf = (p: Page): string | null => {
    if (p.sourceId) {
      const s = sourceById.get(p.sourceId);
      const host = s?.pageId ?? s?.hostPageId ?? null;
      return host && byId.has(host) ? host : null;
    }
    return p.parentId && byId.has(p.parentId) ? p.parentId : null;
  };

  const children = new Map<string | null, Page[]>();
  for (const p of live) {
    const parent = parentOf(p);
    const list = children.get(parent) ?? [];
    list.push(p);
    children.set(parent, list);
  }

  // Folder names, unique among siblings.
  const nameOf = new Map<string, string>();
  for (const list of children.values()) {
    const used = new Set<string>();
    list.sort((a, b) => Number(a.createdAt ?? 0) - Number(b.createdAt ?? 0));
    for (const p of list) {
      const base = fsName(p.title || untitled, untitled);
      let name = base;
      for (let n = 2; used.has(name.toLowerCase()); n++) {
        name = `${base} (${n})`;
      }
      used.add(name.toLowerCase());
      nameOf.set(p.id, name);
    }
  }

  const files: BackupFile[] = [];
  const seen = new Set<string>();
  const visit = async (parentId: string | null, dir: string) => {
    for (const page of children.get(parentId) ?? []) {
      if (seen.has(page.id)) continue; // a loop in the data: once is enough
      seen.add(page.id);
      const name = nameOf.get(page.id)!;
      const content = await pageContent(personId, page);
      files.push({
        path: `${dir}${name}.md`,
        content: pageMarkdown(serializers, page, content, untitled),
      });

      // A database on this page: its table as a CSV beside its rows.
      const source = dataSources.find(
        (s) => (s.pageId ?? s.hostPageId) === page.id,
      );
      if (source) {
        const rows = live.filter((p) => p.sourceId === source.id);
        files.push({
          path: `${dir}${name}/${fsName(source.name || name, name)}.csv`,
          content: toCsv(source.properties, rows),
        });
      }
      await visit(page.id, `${dir}${name}/`);
    }
  };
  await visit(null, "");
  return files;
}

let running = false;

/** Writes the backup now. Resolves with how many files it holds, or null
 *  when there's nothing to do (no folder, already running, web). */
export async function runBackup(input: BackupInput): Promise<number | null> {
  if (!isDesktopApp || running) return null;
  const settings = readBackupSettings(input.personId);
  if (!settings.folder) return null;
  running = true;
  try {
    const files = await buildBackupFiles(input);
    const { invoke } = await core();
    const count = await invoke<number>("backup_write", {
      folder: settings.folder,
      root: fsName(input.workspaceName, "Folio"),
      files,
    });
    updateBackupSettings(input.personId, {
      lastAt: Date.now(),
      lastCount: files.filter((f) => f.path.endsWith(".md")).length,
    });
    return count;
  } finally {
    running = false;
  }
}

/** Whether a scheduled backup is due. */
export function backupDue(settings: BackupSettings, now = Date.now()) {
  return (
    settings.enabled &&
    !!settings.folder &&
    (settings.lastAt === null ||
      now - settings.lastAt >= BACKUP_INTERVAL_MS[settings.every])
  );
}
