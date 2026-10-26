import type { ID, Page, PageCover, PageSettings } from "src/types";
import type { JSONContent } from "@tiptap/react";
import { http, keysToCamel, keysToSnake } from "./client";
import { supabase } from "./supabase-client";

// No workspace filter: pages_select RLS defines exactly the readable set —
// your current workspace's pages (that you own or can read) plus pages of
// teamspaces you're a member of in other people's workspaces. Filtering by
// workspace_id here would drop the joined-teamspace pages.
export const fetchPages = () => http<Page[]>("/pages");

export const fetchPage = (id: ID) => http<Page>(`/pages/${id}`);

/**
 * A page by id, including one shared with you from another workspace (a
 * link, an invite). The normal read only covers your current workspace and
 * your teamspaces; when it finds nothing, get_accessible_page (migration 040)
 * returns the page if you have any role on it. Null when you don't.
 */
export async function fetchPageOrShared(id: ID): Promise<Page | null> {
  const own = await fetchPage(id);
  if (own) return own;
  const { data, error } = await supabase.rpc("get_accessible_page", {
    p_id: id,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return row ? (keysToCamel(row) as Page) : null;
}

export const patchPage = (id: ID, patch: Partial<Page>) =>
  http<Page>(`/pages/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export const deletePage = (id: ID) =>
  http<void>(`/pages/${id}`, { method: "DELETE" });

export const createPage = (page: Page) =>
  http<Page>("/pages", { method: "POST", body: JSON.stringify(page) });

/** Many pages in one request per `chunk` (an import's rows). `onProgress`
 *  gets the number created so far. */
export async function createPages(
  pages: Page[],
  onProgress?: (done: number) => void,
  chunk = 100,
): Promise<void> {
  for (let i = 0; i < pages.length; i += chunk) {
    const part = pages.slice(i, i + chunk);
    const { error } = await supabase
      .from("pages")
      .insert(keysToSnake(part) as Record<string, unknown>[]);
    if (error) throw new Error(`Error POST /pages: ${error.message}`);
    onProgress?.(Math.min(i + chunk, pages.length));
  }
}

// ── Publish to the web (migration 042) ──────────────────────────────────

/** Publish or unpublish a page (full access only; the server checks). */
export async function setPagePublished(
  id: ID,
  published: boolean,
  includeSubpages = false,
): Promise<void> {
  const { error } = await supabase.rpc("set_page_published", {
    p_id: id,
    p_published: published,
    p_subpages: includeSubpages,
  });
  if (error) throw new Error(error.message);
}

export type PublishedPageLink = {
  id: ID;
  title: string;
  cover: PageCover | null;
};

export type PublishedPage = {
  page: {
    id: ID;
    title: string;
    cover: PageCover | null;
    content: JSONContent | null;
    settings: PageSettings | null;
    updatedAt: number | null;
  };
  rootId: ID;
  /** Published ancestors, from the published page down to the parent. */
  trail: PublishedPageLink[];
  /** Visible subpages (only when the subpages are published). */
  subpages: PublishedPageLink[];
};

/** A published page as a visitor sees it — works signed out. Null when the
 *  page isn't published (or doesn't exist). */
export async function fetchPublishedPage(
  id: ID,
): Promise<PublishedPage | null> {
  const { data, error } = await supabase.rpc("get_published_page", {
    p_id: id,
  });
  if (error) throw new Error(error.message);
  return data ? (keysToCamel(data) as PublishedPage) : null;
}
