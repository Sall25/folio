import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { MemberRole, Person } from "./types";
import { isGuest, isMember } from "./types";

const api = "http://localhost:3007";

const fetchPeopleAsync = async (): Promise<Person[]> => {
  const res = await fetch(`${api}/people`);
  if (!res.ok) throw new Error("Failed to fetch people");
  return res.json();
};

const createPersonFnAsync = async (person: Person): Promise<Person> => {
  const res = await fetch(`${api}/people`, {
    method: "POST",
    body: JSON.stringify(person),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to create person");
  return res.json();
};

const updatePersonFnAsync = async (person: Person): Promise<Person> => {
  const res = await fetch(`${api}/people/${person.id}`, {
    method: "PATCH",
    body: JSON.stringify(person),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to update person");
  return res.json();
};

const deletePersonFnAsync = async (id: string): Promise<void> => {
  const res = await fetch(`${api}/people/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete person");
};

const KEY = ["people"] as const;

export function usePeople() {
  const client = useQueryClient();

  const { data: people, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: fetchPeopleAsync,
    placeholderData: keepPreviousData,
  });

  const { mutateAsync: _create } = useMutation({
    mutationFn: createPersonFnAsync,
    onMutate: async (person: Person) => {
      await client.cancelQueries({ queryKey: KEY });
      const prev = client.getQueryData<Person[]>(KEY);
      client.setQueryData<Person[]>(KEY, (old = []) => [...old, person]);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && client.setQueryData(KEY, ctx.prev),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });

  const { mutateAsync: _update } = useMutation({
    mutationFn: updatePersonFnAsync,
    onMutate: async (person: Person) => {
      await client.cancelQueries({ queryKey: KEY });
      const prev = client.getQueryData<Person[]>(KEY);
      client.setQueryData<Person[]>(KEY, (old = []) =>
        old.map((p) => (p.id === person.id ? { ...p, ...person } : p)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && client.setQueryData(KEY, ctx.prev),
  });

  const { mutateAsync: _delete } = useMutation({
    mutationFn: deletePersonFnAsync,
    onMutate: async (id: string) => {
      await client.cancelQueries({ queryKey: KEY });
      const prev = client.getQueryData<Person[]>(KEY);
      client.setQueryData<Person[]>(KEY, (old = []) =>
        old.filter((p) => p.id !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && client.setQueryData(KEY, ctx.prev),
  });

  const addPersonAsync = useCallback(
    (data: {
      name: string;
      email: string;
      role?: MemberRole;
      avatarUrl?: string;
    }) =>
      _create({
        id: crypto.randomUUID(),
        name: data.name,
        email: data.email,
        role: data.role ?? "member",
        avatarUrl: data.avatarUrl,
        createdAt: Date.now().toString(),
      }),
    [_create],
  );

  const updatePersonAsync = useCallback(
    (person: Person) => _update(person),
    [_update],
  );
  const setRoleAsync = useCallback(
    (person: Person, role: MemberRole) => _update({ ...person, role }),
    [_update],
  );
  const removePersonAsync = useCallback((id: string) => _delete(id), [_delete]);

  const members = useMemo(() => (people ?? []).filter(isMember), [people]);
  const guests = useMemo(() => (people ?? []).filter(isGuest), [people]);

  return {
    people: people ?? [],
    members,
    guests,
    isLoading,
    addPersonAsync,
    updatePersonAsync,
    setRoleAsync,
    removePersonAsync,
  };
}
