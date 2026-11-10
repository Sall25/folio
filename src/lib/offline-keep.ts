import { useSyncExternalStore } from "react";
import type { Page } from "src/types";
import { isDesktopApp } from "src/lib/desktop";

// Which pages each person wants kept on this device, ready to open offline
// ("Available offline" in the page menu). OfflineDocSync downloads them in the
// background and keeps them fresh while online (download-offline-pages.ts),
// and pruneDocCache never drops them.
//
// Three ways to keep a page:
//   • the page itself
//   • its teamspace — "Available offline" on a teamspace's root page keeps
//     every page in it, database rows included
//   • favorites — the "Keep favorites available offline" setting
//   • the whole workspace — "Keep this workspace available offline" in My
//     settings keeps every page of the workspace. On by default in the
//     desktop app (copies are files on disk there, with room for them):
//     turning it off there is remembered in workspacesOff.
//
// Stored in localStorage, per person (a choice on this device, not an
// account setting). Only page ids — nothing another account could read.

export interface KeepChoices {
  pages: string[];
  teamspaces: string[];
  favorites: boolean;
  workspaces: string[];
  /** Desktop app: workspaces this person turned "keep offline" off for.
   *  Every other workspace is kept there. Ignored on the web. */
  workspacesOff?: string[];
}

const EMPTY: KeepChoices = {
  pages: [],
  teamspaces: [],
  favorites: false,
  workspaces: [],
};
const storageKey = (personId: string) => `folio-offline-keep:${personId}`;

// Parsed once per stored string, so useSyncExternalStore gets the same object
// until something changes.
const cache = new Map<string, { raw: string | null; value: KeepChoices }>();

export function readKeepChoices(personId: string): KeepChoices {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey(personId));
  } catch {
    /* storage blocked */
  }
  const hit = cache.get(personId);
  if (hit && hit.raw === raw) return hit.value;
  let value = EMPTY;
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<KeepChoices>) : null;
    if (parsed) {
      value = {
        pages: Array.isArray(parsed.pages) ? parsed.pages : [],
        teamspaces: Array.isArray(parsed.teamspaces) ? parsed.teamspaces : [],
        favorites: parsed.favorites === true,
        workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : [],
        workspacesOff: Array.isArray(parsed.workspacesOff)
          ? parsed.workspacesOff
          : [],
      };
    }
  } catch {
    /* unreadable: start over */
  }
  cache.set(personId, { raw, value });
  return value;
}

const listeners = new Set<() => void>();

/** Told when anyone's choices change, in this tab or another. */
export function subscribeKeepChoices(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith("folio-offline-keep:")) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function writeKeepChoices(personId: string, next: KeepChoices) {
  try {
    localStorage.setItem(storageKey(personId), JSON.stringify(next));
  } catch {
    /* storage blocked: the choice lasts until reload */
  }
  listeners.forEach((l) => l());
}

const toggle = (ids: string[], id: string, on: boolean) =>
  on ? (ids.includes(id) ? ids : [...ids, id]) : ids.filter((x) => x !== id);

export function setPageKept(personId: string, pageId: string, on: boolean) {
  const c = readKeepChoices(personId);
  writeKeepChoices(personId, { ...c, pages: toggle(c.pages, pageId, on) });
}

export function setTeamspaceKept(
  personId: string,
  teamspaceId: string,
  on: boolean,
) {
  const c = readKeepChoices(personId);
  writeKeepChoices(personId, {
    ...c,
    teamspaces: toggle(c.teamspaces, teamspaceId, on),
  });
}

export function setWorkspaceKept(
  personId: string,
  workspaceId: string,
  on: boolean,
) {
  const c = readKeepChoices(personId);
  writeKeepChoices(personId, {
    ...c,
    workspaces: toggle(c.workspaces, workspaceId, on),
    workspacesOff: toggle(c.workspacesOff ?? [], workspaceId, !on),
  });
}

/** Whether every page of this workspace is kept: turned on, or — in the
 *  desktop app — not turned off. */
export function isWorkspaceKept(
  choices: KeepChoices,
  workspaceId: string | null | undefined,
  desktop: boolean = isDesktopApp,
): boolean {
  if (!workspaceId) return false;
  if (choices.workspaces.includes(workspaceId)) return true;
  return desktop && !(choices.workspacesOff ?? []).includes(workspaceId);
}

export function setKeepFavorites(personId: string, on: boolean) {
  writeKeepChoices(personId, { ...readKeepChoices(personId), favorites: on });
}

/** This person's choices, live. */
export function useKeepChoices(personId: string | null): KeepChoices {
  return useSyncExternalStore(
    subscribeKeepChoices,
    () => (personId ? readKeepChoices(personId) : EMPTY),
    () => EMPTY,
  );
}

const isTeamspaceRoot = (page: Page) => page.teamspaceId === page.id;

/** How a page is kept: by its own choice, through its teamspace or as a
 *  favorite — or not at all. */
export function keptBy(
  page: Page,
  choices: KeepChoices,
): "page" | "teamspace" | "favorites" | "workspace" | null {
  const inKeptWorkspace = isWorkspaceKept(choices, page.workspaceId);
  if (isTeamspaceRoot(page)) {
    if (choices.teamspaces.includes(page.id)) return "teamspace";
    return inKeptWorkspace ? "workspace" : null;
  }
  if (choices.pages.includes(page.id)) return "page";
  if (page.teamspaceId && choices.teamspaces.includes(page.teamspaceId)) {
    return "teamspace";
  }
  if (choices.favorites && page.category === "Favorites") return "favorites";
  if (inKeptWorkspace) return "workspace";
  return null;
}

/** Every page to keep on this device, out of the pages this person can see
 *  (the pages list, database rows included). Pages in the trash are left
 *  out. */
export function keptPageIds(pages: Page[], choices: KeepChoices): string[] {
  if (
    !isDesktopApp &&
    choices.pages.length === 0 &&
    choices.teamspaces.length === 0 &&
    !choices.favorites &&
    choices.workspaces.length === 0
  ) {
    return [];
  }
  return pages
    .filter((p) => p.deletedAt == null && keptBy(p, choices) !== null)
    .map((p) => p.id);
}
