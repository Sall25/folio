import type { ID, MemberRole } from "src/types";
import { supabase } from "./supabase-client";
import { appUrl } from "src/lib/app-url";

// Workspace membership, invites and invite links — all through the
// server functions in migration 041 (they check who may do what).

export interface WorkspaceInvite {
  id: ID;
  workspaceId: ID;
  email: string;
  role: Exclude<MemberRole, "owner">;
  invitedBy: ID | null;
  inviterName: string | null;
  workspaceName: string | null;
  status: "pending" | "accepted" | "declined" | "revoked";
  createdAt: number;
}

export interface InviteLinkPreview {
  workspaceId: ID;
  name: string;
  icon: string | null;
  iconColor: string | null;
  iconTarget: string | null;
  memberCount: number;
  alreadyMember: boolean;
}

interface InviteRow {
  id: string;
  workspace_id: string;
  email: string;
  role: "member" | "guest";
  invited_by: string | null;
  inviter_name: string | null;
  workspace_name: string | null;
  status: WorkspaceInvite["status"];
  created_at: number;
}

const toInvite = (r: InviteRow): WorkspaceInvite => ({
  id: r.id,
  workspaceId: r.workspace_id,
  email: r.email,
  role: r.role,
  invitedBy: r.invited_by,
  inviterName: r.inviter_name,
  workspaceName: r.workspace_name,
  status: r.status,
  createdAt: r.created_at,
});

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

// ── Invites ──────────────────────────────────────────────────────────────

/** Pending invites you can see: ones addressed to your email, and (as an
 *  owner) ones you've sent. Split by the callers below. */
async function fetchPendingInvites(): Promise<WorkspaceInvite[]> {
  const { data, error } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  fail(error);
  return ((data ?? []) as InviteRow[]).map(toInvite);
}

export async function fetchMyWorkspaceInvites(
  email: string,
): Promise<WorkspaceInvite[]> {
  const mine = email.trim().toLowerCase();
  return (await fetchPendingInvites()).filter(
    (i) => i.email.toLowerCase() === mine,
  );
}

export async function fetchSentWorkspaceInvites(
  workspaceId: ID,
): Promise<WorkspaceInvite[]> {
  return (await fetchPendingInvites()).filter(
    (i) => i.workspaceId === workspaceId,
  );
}

export async function inviteToWorkspace(
  workspaceId: ID,
  email: string,
  role: "member" | "guest",
): Promise<void> {
  const { error } = await supabase.rpc("invite_to_workspace", {
    ws: workspaceId,
    p_email: email,
    p_role: role,
  });
  fail(error);
}

/** Accepts the invite and returns the workspace you joined. */
export async function acceptWorkspaceInvite(inviteId: ID): Promise<ID> {
  const { data, error } = await supabase.rpc("accept_workspace_invite", {
    p_invite: inviteId,
  });
  fail(error);
  return data as ID;
}

export async function declineWorkspaceInvite(inviteId: ID): Promise<void> {
  const { error } = await supabase.rpc("decline_workspace_invite", {
    p_invite: inviteId,
  });
  fail(error);
}

export async function revokeWorkspaceInvite(inviteId: ID): Promise<void> {
  const { error } = await supabase.rpc("revoke_workspace_invite", {
    p_invite: inviteId,
  });
  fail(error);
}

// ── Invite link ──────────────────────────────────────────────────────────

export async function fetchWorkspaceInviteLink(
  workspaceId: ID,
): Promise<{ token: string; enabled: boolean }> {
  const { data, error } = await supabase.rpc("get_workspace_invite_link", {
    ws: workspaceId,
  });
  fail(error);
  const row = (Array.isArray(data) ? data[0] : data) as
    { token: string; enabled: boolean } | undefined;
  return { token: row?.token ?? "", enabled: row?.enabled ?? false };
}

export async function setWorkspaceInviteLinkEnabled(
  workspaceId: ID,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase.rpc("set_workspace_invite_link_enabled", {
    ws: workspaceId,
    p_enabled: enabled,
  });
  fail(error);
}

export async function regenerateWorkspaceInviteLink(
  workspaceId: ID,
): Promise<string> {
  const { data, error } = await supabase.rpc(
    "regenerate_workspace_invite_link",
    { ws: workspaceId },
  );
  fail(error);
  return data as string;
}

/** What the join screen shows; null when the link is off or unknown. */
export async function previewWorkspaceInvite(
  token: string,
): Promise<InviteLinkPreview | null> {
  const { data, error } = await supabase.rpc("preview_workspace_invite", {
    p_token: token,
  });
  fail(error);
  const r = (Array.isArray(data) ? data[0] : data) as
    | {
        workspace_id: string;
        name: string;
        icon: string | null;
        icon_color: string | null;
        icon_target: string | null;
        member_count: number;
        already_member: boolean;
      }
    | undefined;
  if (!r) return null;
  return {
    workspaceId: r.workspace_id,
    name: r.name,
    icon: r.icon,
    iconColor: r.icon_color,
    iconTarget: r.icon_target,
    memberCount: Number(r.member_count),
    alreadyMember: r.already_member,
  };
}

/** Joins through an invite link; returns the workspace you joined. */
export async function joinWorkspaceWithLink(token: string): Promise<ID> {
  const { data, error } = await supabase.rpc("join_workspace_with_link", {
    p_token: token,
  });
  fail(error);
  return data as ID;
}

export const inviteLinkUrl = (token: string) =>
  appUrl(`/invite/${token}`);

// ── Members ──────────────────────────────────────────────────────────────

export async function setWorkspaceMemberRole(
  workspaceId: ID,
  personId: ID,
  role: MemberRole,
): Promise<void> {
  const { error } = await supabase.rpc("set_workspace_member_role", {
    ws: workspaceId,
    person: personId,
    new_role: role,
  });
  fail(error);
}

/** Removes someone (owners), or yourself (leaving the workspace). */
export async function removeWorkspaceMember(
  workspaceId: ID,
  personId: ID,
): Promise<void> {
  const { error } = await supabase.rpc("remove_workspace_member", {
    ws: workspaceId,
    person: personId,
  });
  fail(error);
}
