import type { Page } from "src/types";

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

export function addLocalPage(page: Page) {
  write({ ...read(), [page.id]: page });
}

export function removeLocalPage(id: string) {
  const pages = read();
  if (!(id in pages)) return;
  delete pages[id];
  write(pages);
}

export const isLocalPage = (id: string) => id in read();
export const localPages = (): Page[] => Object.values(read());

/** The server's list plus the pages still waiting to be sent. */
export function withLocalPages(server: Page[]): Page[] {
  const known = new Set(server.map((p) => p.id));
  const waiting = localPages().filter((p) => !known.has(p.id));
  // Already on the server: no longer waiting.
  localPages()
    .filter((p) => known.has(p.id))
    .forEach((p) => removeLocalPage(p.id));
  return waiting.length ? [...server, ...waiting] : server;
}
