import type { Page } from "src/components/tiptap-templates/simple/types";
import type { Version } from "./types";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";

const url = "http://localhost:3003";

const fetchVersionsAsync = async (pageId: number): Promise<Version[]> => {
  const res = await fetch(`${url}/versions?pageId=${pageId}`);
  if (!res.ok) throw new Error("Failed to fetch versions");
  return res.json();
};

const createVersionFnAsync = async (data: {
  pageId: number;
  title: string;
  content: Page["content"];
  isNamed: boolean;
  name?: string;
}): Promise<Version> => {
  const res = await fetch(`${url}/versions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now().toString(),
    }),
  });
  if (!res.ok) throw new Error("Failed to create version");
  return res.json();
};

const nameVersionFnAsync = async (
  id: number,
  name: string,
): Promise<Version> => {
  const res = await fetch(`${url}/versions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, isNamed: true }),
  });
  if (!res.ok) throw new Error("Failed to name version");
  return res.json();
};

const restoreVersionFnAsync = async (version: Version): Promise<void> => {
  const res = await fetch(`${url}/pages/${version.pageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: version.title,
      content: version.content,
      updatedAt: Date.now().toString(),
    }),
  });
  if (!res.ok) throw new Error("Failed to restore version");
};

const pruneVersionsAsync = async (pageId: number) => {
  const res = await fetch(`${url}/versions?pageId=${pageId}`);
  const versions: Version[] = await res.json();

  const unnamed = versions
    .filter((v) => !v.isNamed)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  if (unnamed.length <= 50) return;

  const toDelete = unnamed.slice(50);
  await Promise.all(
    toDelete.map((v) => fetch(`${url}/versions/${v.id}`, { method: "DELETE" })),
  );
};

export type UseVersionsReturn = ReturnType<typeof useVersions>;

export function useVersions(pageId: number | undefined) {
  const client = useQueryClient();

  const { data: versions = [] } = useQuery({
    queryKey: ["versions", pageId],
    queryFn: () => fetchVersionsAsync(pageId!),
    enabled: !!pageId,
    staleTime: 1000 * 60 * 5, // don't refetch on every focus
    placeholderData: keepPreviousData,
  });

  const { mutateAsync: createVersionAsync } = useMutation({
    mutationFn: createVersionFnAsync,
    onSuccess: async (newVersion, variables) => {
      await pruneVersionsAsync(variables.pageId);
      //  update cache directly
      client.setQueryData<Version[]>(
        ["versions", variables.pageId],
        (old = []) => [newVersion, ...old],
      );
    },
  });

  const { mutateAsync: nameVersionAsync } = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      nameVersionFnAsync(id, name),
    onSuccess: (updatedVersion) => {
      //  update cache directly
      client.setQueryData<Version[]>(["versions", pageId], (old = []) =>
        old.map((v) => (v.id === updatedVersion.id ? updatedVersion : v)),
      );
    },
  });

  const { mutateAsync: restoreVersionAsync } = useMutation({
    mutationFn: (version: Version) => restoreVersionFnAsync(version),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["pages"] }); // this one needs to invalidate
    },
  });

  // Stabilize the returned object so spreads don't create new refs
  return useMemo(
    () => ({
      versions,
      createVersionAsync,
      nameVersionAsync,
      restoreVersionAsync,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [versions], // mutateAsync fns are stable enough within a session
  );
}
