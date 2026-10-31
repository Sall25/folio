import type { ID } from "src/types";
import { supabase } from "./supabase-client";

// Where you show teamspaces besides their home workspace (migration 050).
// Row security returns only your own rows.

export interface TeamspacePlacement {
  teamspaceId: ID;
  workspaceId: ID;
}

export async function fetchTeamspacePlacements(): Promise<
  TeamspacePlacement[]
> {
  const { data, error } = await supabase
    .from("teamspace_placements")
    .select("teamspace_id, workspace_id");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    teamspaceId: r.teamspace_id as string,
    workspaceId: r.workspace_id as string,
  }));
}

export async function addTeamspacePlacement(
  p: TeamspacePlacement,
): Promise<void> {
  const { error } = await supabase
    .from("teamspace_placements")
    .insert({ teamspace_id: p.teamspaceId, workspace_id: p.workspaceId });
  if (error) throw error;
}

export async function removeTeamspacePlacement(
  p: TeamspacePlacement,
): Promise<void> {
  const { error } = await supabase
    .from("teamspace_placements")
    .delete()
    .eq("teamspace_id", p.teamspaceId)
    .eq("workspace_id", p.workspaceId);
  if (error) throw error;
}

/** A teamspace's home workspace, for everyone (owners only). */
export async function moveTeamspace(
  teamspaceId: ID,
  workspaceId: ID,
): Promise<void> {
  const { error } = await supabase.rpc("move_teamspace", {
    p_ts: teamspaceId,
    p_ws: workspaceId,
  });
  if (error) throw error;
}
