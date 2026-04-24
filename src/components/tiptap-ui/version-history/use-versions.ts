import type { Page } from "src/components/tiptap-templates/simple/types";
import type { Version } from "./types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const url = "http://localhost:3003";

const fetchVersionsAsync = async (pageId: string): Promise<Version[]> => {
  const res = await fetch(`${url}/versions?pageId=${pageId}`);
  if (!res.ok) throw new Error("Failed to fetch versions");
  return res.json();
};

const createVersionFnAsync = async (data: {
  pageId: string;
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
  id: string,
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

const pruneVersionsAsync = async (pageId: string) => {
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

export function useVersions(pageId: string | null) {
  const client = useQueryClient();

  const { data: versions = [] } = useQuery({
    queryKey: ["versions", pageId],
    queryFn: () => fetchVersionsAsync(pageId!),
    enabled: !!pageId,
  });

  const { mutateAsync: createVersionAsync } = useMutation({
    mutationFn: createVersionFnAsync,
    onSuccess: async (_, variables) => {
      // Prune after every create
      await pruneVersionsAsync(variables.pageId);
      client.invalidateQueries({ queryKey: ["versions", variables.pageId] });
    },
  });

  const { mutateAsync: nameVersionAsync } = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      nameVersionFnAsync(id, name),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["versions", pageId] }),
  });

  const { mutateAsync: restoreVersionAsync } = useMutation({
    mutationFn: (version: Version) => restoreVersionFnAsync(version),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["pages"] });
      client.invalidateQueries({ queryKey: ["versions", pageId] });
    },
  });

  return {
    versions,
    createVersionAsync,
    nameVersionAsync,
    restoreVersionAsync,
  };
}
