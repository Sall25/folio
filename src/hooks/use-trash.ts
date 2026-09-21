import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTrashedPages,
  restorePage,
  deletePagePermanently,
  emptyTrash,
} from "src/api/pages-trash";
import type { ID } from "src/types";

const TRASH_KEY = ["trashed-pages"];

// Trashed pages (deletedAt not null). Invalidated by the mutations below and
// should also be invalidated wherever a page is trashed (so trash count/age
// stay fresh).
export function useTrashedPages(workspaceId: ID) {
  return useQuery({
    queryKey: TRASH_KEY,
    queryFn: () => fetchTrashedPages(workspaceId),
  });
}

export function useRestorePage(workspaceId: ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => restorePage(pageId, workspaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRASH_KEY });
      qc.invalidateQueries({ queryKey: ["pages"] }); // adjust to your pages key
    },
  });
}

export function useDeletePagePermanently(workspaceId: ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => deletePagePermanently(pageId, workspaceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: TRASH_KEY }),
  });
}

export function useEmptyTrash(workspaceId: ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => emptyTrash(workspaceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: TRASH_KEY }),
  });
}
