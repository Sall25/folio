import type { ID, InviteLink } from "src/types";
import { http } from "./client";

// Workspace-level settings — a single record. Stored as a one-element
// collection with a fixed id so it uses standard json-server routes
// (/workspaceSettings/default) instead of singleton-object routes.
export interface WorkspaceSettings {
  id: ID;
  inviteLink: InviteLink;
}

export const WORKSPACE_SETTINGS_ID = "default";

export const fetchWorkspaceSettings = () =>
  http<WorkspaceSettings>(`/workspaceSettings/${WORKSPACE_SETTINGS_ID}`);

export const patchWorkspaceSettings = (
  patch: Partial<Omit<WorkspaceSettings, "id">>,
) =>
  http<WorkspaceSettings>(`/workspaceSettings/${WORKSPACE_SETTINGS_ID}`, {
    method: "PATCH",
    body: JSON.stringify({ ...patch }),
  });
