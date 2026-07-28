import type { ID, PageAccessGrant, PageRole } from "src/types";
import { http } from "./client";

// Grants for a page. The http shim maps /pageAccess → the page_access table;
// add "pageAccess": "page_access" to TABLE in client.ts.

export const fetchPageAccess = (pageId: ID) =>
  http<PageAccessGrant[]>(`/pageAccess?pageId=${pageId}`);

// The DB generates id and created_at, so callers send neither.
export const createPageAccess = (
  grant: Omit<PageAccessGrant, "id" | "createdAt">,
) =>
  http<PageAccessGrant>("/pageAccess", {
    method: "POST",
    body: JSON.stringify(grant),
  });

// Change a grant's role.
export const patchPageAccess = (id: ID, role: PageRole) =>
  http<PageAccessGrant>(`/pageAccess/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });

// Remove a grant (unshare).
export const deletePageAccess = (id: ID) =>
  http<void>(`/pageAccess/${id}`, { method: "DELETE" });
