import type { ID, Workspace } from "src/types";
import { http } from "./client";

// Mirrors api/teamspaces.ts. The http shim maps /workspaces → the `workspaces`
// table (add it to TABLE in client.ts). `settings` is a jsonb column and is in
// JSONB_PASSTHROUGH, so the nested WorkspaceSettings object round-trips whole
// without key-casing its internals.

export const fetchWorkspaces = () => http<Workspace[]>("/workspaces");

export const fetchWorkspace = (id: ID) => http<Workspace>(`/workspaces/${id}`);

export const patchWorkspace = (id: ID, patch: Partial<Workspace>) =>
  http<Workspace>(`/workspaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export const createWorkspace = (workspace: Workspace) =>
  http<Workspace>("/workspaces", {
    method: "POST",
    body: JSON.stringify(workspace),
  });

export const deleteWorkspace = (id: ID) =>
  http<void>(`/workspaces/${id}`, { method: "DELETE" });
