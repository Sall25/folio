import type { InviteStatus, TeamspaceInvite } from "src/types";
import { supabase } from "./supabase-client";

interface InviteRow {
  id: string;
  teamspace_id: string;
  email: string;
  invited_by: string | null;
  inviter_name: string | null;
  teamspace_name: string | null;
  icon_name: string | null;
  icon_target: string | null;
  status: InviteStatus;
  created_at: number;
}

const toInvite = (r: InviteRow): TeamspaceInvite => ({
  id: r.id,
  teamspaceId: r.teamspace_id,
  email: r.email,
  invitedBy: r.invited_by,
  inviterName: r.inviter_name,
  teamspaceName: r.teamspace_name,
  iconName: r.icon_name,
  iconTarget: r.icon_target,
  status: r.status,
  createdAt: r.created_at,
});

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

// Pending invites RLS lets you see: ones addressed to your email, plus ones
// sent from teamspaces you own. The hooks split them.
export async function fetchPendingInvites(): Promise<TeamspaceInvite[]> {
  const { data, error } = await supabase
    .from("teamspace_invites")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  fail(error);
  return ((data ?? []) as InviteRow[]).map(toInvite);
}

export async function inviteToTeamspace(teamspaceId: string, email: string) {
  const { error } = await supabase.rpc("invite_to_teamspace", {
    p_ts: teamspaceId,
    p_email: email,
  });
  fail(error);
}

export async function acceptTeamspaceInvite(inviteId: string): Promise<string> {
  const { data, error } = await supabase.rpc("accept_teamspace_invite", {
    p_invite: inviteId,
  });
  fail(error);
  return data as string;
}

export async function declineTeamspaceInvite(inviteId: string) {
  const { error } = await supabase.rpc("decline_teamspace_invite", {
    p_invite: inviteId,
  });
  fail(error);
}

export async function revokeTeamspaceInvite(inviteId: string) {
  const { error } = await supabase.rpc("revoke_teamspace_invite", {
    p_invite: inviteId,
  });
  fail(error);
}

export async function addTeamspaceMember(
  teamspaceId: string,
  personId: string,
) {
  const { error } = await supabase.rpc("add_teamspace_member", {
    p_ts: teamspaceId,
    p_person: personId,
  });
  fail(error);
}

export async function removeTeamspaceMember(
  teamspaceId: string,
  personId: string,
) {
  const { error } = await supabase.rpc("remove_teamspace_member", {
    p_ts: teamspaceId,
    p_person: personId,
  });
  fail(error);
}

export async function setTeamspaceOwner(
  teamspaceId: string,
  personId: string,
  owner: boolean,
) {
  const { error } = await supabase.rpc("set_teamspace_owner", {
    p_ts: teamspaceId,
    p_person: personId,
    p_owner: owner,
  });
  fail(error);
}
