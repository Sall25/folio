import type { ID, Workspace } from "src/types";
import { http } from "./client";
import { supabase } from "./supabase-client";

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

// ── RPC: atomic create-and-switch / switch, run server-side as the caller ───
export const createWorkspaceRpc = async (name: string): Promise<ID> => {
  const { data, error } = await supabase.rpc("create_workspace", {
    ws_name: name,
  });
  if (error) throw error;
  return data as ID;
};

export const switchWorkspaceRpc = async (targetWsId: ID): Promise<void> => {
  const { error } = await supabase.rpc("switch_workspace", {
    target_ws_id: targetWsId,
  });
  if (error) throw error;
};
