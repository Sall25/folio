import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import type { Teamspace, TeamspaceAccess } from "./types";

const api = "http://localhost:3005";

const fetchTeamspacesAsync = async (): Promise<Teamspace[]> => {
  const res = await fetch(`${api}/teamspaces`);
  if (!res.ok) throw new Error("Failed to fetch teamspaces");
  return res.json();
};

const createTeamspaceFnAsync = async (ts: Teamspace): Promise<Teamspace> => {
  const res = await fetch(`${api}/teamspaces`, {
    method: "POST",
    body: JSON.stringify(ts),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to create teamspace");
  return res.json();
};

const updateTeamspaceFnAsync = async (ts: Teamspace): Promise<Teamspace> => {
  const res = await fetch(`${api}/teamspaces/${ts.id}`, {
    method: "PATCH",
    body: JSON.stringify(ts),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to update teamspace");
  return res.json();
};

const deleteTeamspaceFnAsync = async (id: string): Promise<void> => {
  const res = await fetch(`${api}/teamspaces/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete teamspace");
};

const KEY = ["teamspaces"] as const;

export function useTeamspaces() {
  const client = useQueryClient();

  const { data: teamspaces, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: fetchTeamspacesAsync,
    placeholderData: keepPreviousData,
  });

  const { mutateAsync: _create } = useMutation({
    mutationFn: createTeamspaceFnAsync,
    onMutate: async (ts: Teamspace) => {
      await client.cancelQueries({ queryKey: KEY });
      const prev = client.getQueryData<Teamspace[]>(KEY);
      client.setQueryData<Teamspace[]>(KEY, (old = []) => [...old, ts]);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && client.setQueryData(KEY, ctx.prev),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });

  const { mutateAsync: _update } = useMutation({
    mutationFn: updateTeamspaceFnAsync,
    onMutate: async (ts: Teamspace) => {
      await client.cancelQueries({ queryKey: KEY });
      const prev = client.getQueryData<Teamspace[]>(KEY);
      client.setQueryData<Teamspace[]>(KEY, (old = []) =>
        old.map((t) => (t.id === ts.id ? { ...t, ...ts } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && client.setQueryData(KEY, ctx.prev),
  });

  const { mutateAsync: _delete } = useMutation({
    mutationFn: deleteTeamspaceFnAsync,
    onMutate: async (id: string) => {
      await client.cancelQueries({ queryKey: KEY });
      const prev = client.getQueryData<Teamspace[]>(KEY);
      client.setQueryData<Teamspace[]>(KEY, (old = []) =>
        old.filter((t) => t.id !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && client.setQueryData(KEY, ctx.prev),
  });

  const current = useCallback(
    (id: string): Teamspace | undefined =>
      client.getQueryData<Teamspace[]>(KEY)?.find((t) => t.id === id),
    [client],
  );

  const addTeamspaceAsync = useCallback(
    (data: {
      name?: string;
      icon?: string;
      access?: TeamspaceAccess;
      memberIds?: string[];
      groupIds?: string[];
      ownerIds?: string[];
    }) =>
      _create({
        id: crypto.randomUUID(),
        name: data.name ?? "New teamspace",
        icon: data.icon,
        access: data.access ?? "open",
        memberIds: data.memberIds ?? [],
        groupIds: data.groupIds ?? [],
        ownerIds: data.ownerIds ?? [],
        createdAt: Date.now().toString(),
      }),
    [_create],
  );

  /** Closes the "Create teamspace from group" stub: seed with the group attached. */
  const createFromGroupAsync = useCallback(
    (groupId: string, name: string) =>
      addTeamspaceAsync({ name, groupIds: [groupId] }),
    [addTeamspaceAsync],
  );

  const renameTeamspaceAsync = useCallback(
    (id: string, name: string) => {
      const t = current(id);
      if (!t) return Promise.resolve(t as unknown as Teamspace);
      return _update({ ...t, name });
    },
    [current, _update],
  );

  const setAccessAsync = useCallback(
    (id: string, access: TeamspaceAccess) => {
      const t = current(id);
      if (!t) return Promise.resolve(t as unknown as Teamspace);
      return _update({ ...t, access });
    },
    [current, _update],
  );

  const setIconAsync = useCallback(
    (id: string, icon: string | undefined) => {
      const t = current(id);
      if (!t) return Promise.resolve(t as unknown as Teamspace);
      return _update({ ...t, icon });
    },
    [current, _update],
  );

  // Member + group membership (toggle helpers, read latest from cache).
  const addMemberAsync = useCallback(
    (id: string, personId: string) => {
      const t = current(id);
      if (!t || t.memberIds.includes(personId))
        return Promise.resolve(t as unknown as Teamspace);
      return _update({ ...t, memberIds: [...t.memberIds, personId] });
    },
    [current, _update],
  );

  const removeMemberAsync = useCallback(
    (id: string, personId: string) => {
      const t = current(id);
      if (!t) return Promise.resolve(t as unknown as Teamspace);
      return _update({
        ...t,
        memberIds: t.memberIds.filter((x) => x !== personId),
      });
    },
    [current, _update],
  );

  const attachGroupAsync = useCallback(
    (id: string, groupId: string) => {
      const t = current(id);
      if (!t || t.groupIds.includes(groupId))
        return Promise.resolve(t as unknown as Teamspace);
      return _update({ ...t, groupIds: [...t.groupIds, groupId] });
    },
    [current, _update],
  );

  const detachGroupAsync = useCallback(
    (id: string, groupId: string) => {
      const t = current(id);
      if (!t) return Promise.resolve(t as unknown as Teamspace);
      return _update({
        ...t,
        groupIds: t.groupIds.filter((x) => x !== groupId),
      });
    },
    [current, _update],
  );

  const deleteTeamspaceAsync = useCallback(
    (id: string) => _delete(id),
    [_delete],
  );

  return {
    teamspaces: teamspaces ?? [],
    isLoading,
    addTeamspaceAsync,
    createFromGroupAsync,
    renameTeamspaceAsync,
    setAccessAsync,
    setIconAsync,
    addMemberAsync,
    removeMemberAsync,
    attachGroupAsync,
    detachGroupAsync,
    deleteTeamspaceAsync,
  };
}
