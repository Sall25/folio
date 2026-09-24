import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptTeamspaceInvite,
  addTeamspaceMember,
  declineTeamspaceInvite,
  fetchPendingInvites,
  inviteToTeamspace,
  removeTeamspaceMember,
  revokeTeamspaceInvite,
  setTeamspaceOwner,
} from "src/api/teamspace-members";
import type { ChatPerson, Teamspace } from "src/types";
import { queryKeys } from "src/lib/queryKeys";
import { useTeamspaces } from "./use-teamspaces";
import { useCurrentPerson } from "./use-session";
import { useChatPeople } from "./use-chat";

const INVITES_KEY = ["teamspace-invites"] as const;

export interface TeamspaceMemberEntry {
  person: ChatPerson;
  isOwner: boolean;
}

// The members of a teamspace (owners + direct members), with names resolved
// across workspaces, owners first then by name.
export function useTeamspaceMemberList(teamspaceId: string | null) {
  const { data: teamspaces = [] } = useTeamspaces();
  const { person } = useCurrentPerson();

  const teamspace = useMemo(
    () =>
      teamspaceId
        ? ((teamspaces as Teamspace[]).find((t) => t.id === teamspaceId) ??
          null)
        : null,
    [teamspaces, teamspaceId],
  );

  const ids = useMemo(
    () =>
      teamspace
        ? [...new Set([...teamspace.ownerIds, ...teamspace.memberIds])]
        : [],
    [teamspace],
  );
  const { data: people = [], isLoading } = useChatPeople(ids);

  const members = useMemo<TeamspaceMemberEntry[]>(() => {
    if (!teamspace) return [];
    const owners = new Set(teamspace.ownerIds);
    return people
      .map((p) => ({ person: p, isOwner: owners.has(p.id) }))
      .sort((a, b) =>
        a.isOwner !== b.isOwner
          ? a.isOwner
            ? -1
            : 1
          : a.person.name.localeCompare(b.person.name, undefined, {
              sensitivity: "base",
            }),
      );
  }, [teamspace, people]);

  const isOwner =
    !!teamspace && !!person && teamspace.ownerIds.includes(person.id);
  const ownerCount = teamspace?.ownerIds.length ?? 0;

  return { teamspace, members, isOwner, ownerCount, isLoading };
}

// ── Invitations ───────────────────────────────────────────────────────────

function usePendingInvitesQuery() {
  const { person } = useCurrentPerson();
  return useQuery({
    queryKey: INVITES_KEY,
    queryFn: fetchPendingInvites,
    enabled: !!person,
    // No realtime on invites yet — refresh periodically and on focus.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

// Invites addressed to YOU (by your account email).
export function useMyInvites() {
  const { person } = useCurrentPerson();
  const query = usePendingInvitesQuery();
  const email = person?.email?.toLowerCase();
  const invites = useMemo(
    () =>
      email
        ? (query.data ?? []).filter((i) => i.email.toLowerCase() === email)
        : [],
    [query.data, email],
  );
  return { invites, isLoading: query.isLoading };
}

// Pending invites SENT from a teamspace (visible to its owners).
export function useTeamspaceInvites(teamspaceId: string | null) {
  const query = usePendingInvitesQuery();
  const invites = useMemo(
    () => (query.data ?? []).filter((i) => i.teamspaceId === teamspaceId),
    [query.data, teamspaceId],
  );
  return { invites, isLoading: query.isLoading };
}

// ── Mutations ─────────────────────────────────────────────────────────────

// Membership changes affect teamspace records, which pages you can read
// (RLS), and teamspace chat rooms — refresh all of them.
function useInvalidateMembership() {
  const qc = useQueryClient();
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: queryKeys.teamspaces.all });
    qc.invalidateQueries({ queryKey: queryKeys.pages.all });
    qc.invalidateQueries({ queryKey: INVITES_KEY });
    qc.invalidateQueries({ queryKey: ["chat", "rooms"] });
  }, [qc]);
}

export function useInviteToTeamspace() {
  const invalidate = useInvalidateMembership();
  return useMutation({
    mutationFn: (args: { teamspaceId: string; email: string }) =>
      inviteToTeamspace(args.teamspaceId, args.email),
    onSuccess: invalidate,
  });
}

export function useAcceptInvite() {
  const invalidate = useInvalidateMembership();
  return useMutation({
    mutationFn: (inviteId: string) => acceptTeamspaceInvite(inviteId),
    onSuccess: invalidate,
  });
}

export function useDeclineInvite() {
  const invalidate = useInvalidateMembership();
  return useMutation({
    mutationFn: (inviteId: string) => declineTeamspaceInvite(inviteId),
    onSuccess: invalidate,
  });
}

export function useRevokeInvite() {
  const invalidate = useInvalidateMembership();
  return useMutation({
    mutationFn: (inviteId: string) => revokeTeamspaceInvite(inviteId),
    onSuccess: invalidate,
  });
}

export function useAddTeamspaceMember() {
  const invalidate = useInvalidateMembership();
  return useMutation({
    mutationFn: (args: { teamspaceId: string; personId: string }) =>
      addTeamspaceMember(args.teamspaceId, args.personId),
    onSuccess: invalidate,
  });
}

export function useRemoveTeamspaceMember() {
  const invalidate = useInvalidateMembership();
  return useMutation({
    mutationFn: (args: { teamspaceId: string; personId: string }) =>
      removeTeamspaceMember(args.teamspaceId, args.personId),
    onSuccess: invalidate,
  });
}

export function useSetTeamspaceOwner() {
  const invalidate = useInvalidateMembership();
  return useMutation({
    mutationFn: (args: {
      teamspaceId: string;
      personId: string;
      owner: boolean;
    }) => setTeamspaceOwner(args.teamspaceId, args.personId, args.owner),
    onSuccess: invalidate,
  });
}
