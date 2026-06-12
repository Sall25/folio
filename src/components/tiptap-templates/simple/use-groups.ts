import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import type { Group } from "./types";

const api = "http://localhost:3006";

const fetchGroupsAsync = async (): Promise<Group[]> => {
  const res = await fetch(`${api}/groups`);
  if (!res.ok) throw new Error("Failed to fetch groups");
  return res.json();
};

const createGroupFnAsync = async (group: Group): Promise<Group> => {
  const res = await fetch(`${api}/groups`, {
    method: "POST",
    body: JSON.stringify(group),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to create group");
  return res.json();
};

const updateGroupFnAsync = async (group: Group): Promise<Group> => {
  const res = await fetch(`${api}/groups/${group.id}`, {
    method: "PATCH",
    body: JSON.stringify(group),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to update group");
  return res.json();
};

const deleteGroupFnAsync = async (id: string): Promise<void> => {
  const res = await fetch(`${api}/groups/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete group");
};

const KEY = ["groups"] as const;

export function useGroups() {
  const client = useQueryClient();

  const { data: groups, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: fetchGroupsAsync,
    placeholderData: keepPreviousData,
  });

  const { mutateAsync: _create } = useMutation({
    mutationFn: createGroupFnAsync,
    onMutate: async (group: Group) => {
      await client.cancelQueries({ queryKey: KEY });
      const prev = client.getQueryData<Group[]>(KEY);
      client.setQueryData<Group[]>(KEY, (old = []) => [...old, group]);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && client.setQueryData(KEY, ctx.prev),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });

  const { mutateAsync: _update } = useMutation({
    mutationFn: updateGroupFnAsync,
    onMutate: async (group: Group) => {
      await client.cancelQueries({ queryKey: KEY });
      const prev = client.getQueryData<Group[]>(KEY);
      client.setQueryData<Group[]>(KEY, (old = []) =>
        old.map((g) => (g.id === group.id ? { ...g, ...group } : g)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && client.setQueryData(KEY, ctx.prev),
  });

  const { mutateAsync: _delete } = useMutation({
    mutationFn: deleteGroupFnAsync,
    onMutate: async (id: string) => {
      await client.cancelQueries({ queryKey: KEY });
      const prev = client.getQueryData<Group[]>(KEY);
      client.setQueryData<Group[]>(KEY, (old = []) =>
        old.filter((g) => g.id !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && client.setQueryData(KEY, ctx.prev),
  });

  // Read current group from cache so member edits patch the latest state.
  const currentGroup = useCallback(
    (id: string): Group | undefined =>
      client.getQueryData<Group[]>(KEY)?.find((g) => g.id === id),
    [client],
  );

  const addGroupAsync = useCallback(
    (data: { name?: string; icon?: string }) =>
      _create({
        id: crypto.randomUUID(),
        name: data.name ?? "New group",
        icon: data.icon,
        memberIds: [],
        createdAt: Date.now().toString(),
      }),
    [_create],
  );

  const renameGroupAsync = useCallback(
    (id: string, name: string) => {
      const g = currentGroup(id);
      if (!g) return Promise.resolve(g as unknown as Group);
      return _update({ ...g, name });
    },
    [currentGroup, _update],
  );

  const setGroupIconAsync = useCallback(
    (id: string, icon: string | undefined) => {
      const g = currentGroup(id);
      if (!g) return Promise.resolve(g as unknown as Group);
      return _update({ ...g, icon });
    },
    [currentGroup, _update],
  );

  const addMemberAsync = useCallback(
    (groupId: string, personId: string) => {
      const g = currentGroup(groupId);
      if (!g || g.memberIds.includes(personId))
        return Promise.resolve(g as unknown as Group);
      return _update({ ...g, memberIds: [...g.memberIds, personId] });
    },
    [currentGroup, _update],
  );

  const removeMemberAsync = useCallback(
    (groupId: string, personId: string) => {
      const g = currentGroup(groupId);
      if (!g) return Promise.resolve(g as unknown as Group);
      return _update({
        ...g,
        memberIds: g.memberIds.filter((id) => id !== personId),
      });
    },
    [currentGroup, _update],
  );

  const setMembersAsync = useCallback(
    (groupId: string, memberIds: string[]) => {
      const g = currentGroup(groupId);
      if (!g) return Promise.resolve(g as unknown as Group);
      return _update({ ...g, memberIds });
    },
    [currentGroup, _update],
  );

  const deleteGroupAsync = useCallback((id: string) => _delete(id), [_delete]);

  return {
    groups: groups ?? [],
    isLoading,
    addGroupAsync,
    renameGroupAsync,
    setGroupIconAsync,
    addMemberAsync,
    removeMemberAsync,
    setMembersAsync,
    deleteGroupAsync,
  };
}
