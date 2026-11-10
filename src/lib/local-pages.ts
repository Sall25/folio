import type { Page } from "src/types";
import { createPage } from "src/api/pages";

// Pages created on this device that the server hasn't confirmed yet: an
// outbox. They're merged into the page list (usePagesBase) so they show
// everywhere, and sent by PageOutboxSync once the server is reachable.
// Kept in localStorage, so a reload or a closed tab loses nothing.
const KEY = "folio-local-pages";

function read(): Record<string, Page> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<
      string,
      Page
    >;
  } catch {
    return {};
  }
}

function write(pages: Record<string, Page>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(pages));
  } catch {
    /* storage full or blocked */
  }
}

// Pages created on this device in this session, kept after the server
// confirms them. Until someone opens one, the collab server holds nothing
// for it but its blank first version, so it can open empty here while the
// server is still waking up instead of waiting for it.
const createdHere = new Set<string>();

export function addLocalPage(page: Page) {
  createdHere.add(page.id);
  write({ ...read(), [page.id]: page });
}

/** Created on this device: still waiting to be sent, or sent this session. */
export const isCreatedHere = (id: string) =>
  createdHere.has(id) || isLocalPage(id);

export function removeLocalPage(id: string) {
  const pages = read();
  if (!(id in pages)) return;
  delete pages[id];
  write(pages);
}

export const isLocalPage = (id: string) => id in read();

/** A change to a page still waiting to be sent goes into the waiting copy
 *  too, so the page is created as it is now (a title typed offline). */
export function updateLocalPage(id: string, patch: Partial<Page>) {
  const pages = read();
  if (!(id in pages)) return;
  pages[id] = { ...pages[id], ...patch };
  write(pages);
}

/** Sends the page now if it's still waiting, so a change to it (a rename,
 *  the trash) never reaches the server before the page does. Throws when
 *  the server can't be reached: the change waits too. */
export async function sendLocalPage(id: string): Promise<void> {
  const page = read()[id];
  if (!page) return;
  try {
    await createPage(page);
  } catch (error) {
    // Already there (sent by PageOutboxSync meanwhile): fine.
    if (!String(error).includes("duplicate")) throw error;
  }
  removeLocalPage(id);
}
export const localPages = (): Page[] => Object.values(read());

/** Whether a page belongs in a workspace's page list: made in that
 *  workspace, or inside a page the list already holds (a teamspace from
 *  another workspace that you've joined). Without this a page made offline
 *  showed in every workspace: the outbox and the optimistic insert added it
 *  to every list. */
export function belongsInList(
  page: Page,
  workspaceId: string,
  list: Page[],
): boolean {
  if (page.workspaceId === workspaceId) return true;
  return list.some(
    (p) => p.id === page.teamspaceId || p.id === page.parentId,
  );
}

/** The server's list for `workspaceId` plus this workspace's pages still
 *  waiting to be sent. */
export function withLocalPages(server: Page[], workspaceId: string): Page[] {
  const known = new Set(server.map((p) => p.id));
  const waiting = localPages().filter(
    (p) => !known.has(p.id) && belongsInList(p, workspaceId, server),
  );
  // Already on the server: no longer waiting.
  localPages()
    .filter((p) => known.has(p.id))
    .forEach((p) => removeLocalPage(p.id));
  return waiting.length ? [...server, ...waiting] : server;
}
