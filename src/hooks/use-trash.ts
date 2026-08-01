import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTrashedPages,
  restorePage,
  deletePagePermanently,
  emptyTrash,
} from "src/api/pages-trash";

const TRASH_KEY = ["trashed-pages"];

// Trashed pages (deletedAt not null). Invalidated by the mutations below and
// should also be invalidated wherever a page is trashed (so trash count/age
// stay fresh).
export function useTrashedPages() {
  return useQuery({
    queryKey: TRASH_KEY,
    queryFn: fetchTrashedPages,
  });
}

export function useRestorePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => restorePage(pageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRASH_KEY });
      qc.invalidateQueries({ queryKey: ["pages"] }); // adjust to your pages key
    },
  });
}

export function useDeletePagePermanently() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => deletePagePermanently(pageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: TRASH_KEY }),
  });
}

export function useEmptyTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => emptyTrash(),
    onSuccess: () => qc.invalidateQueries({ queryKey: TRASH_KEY }),
  });
}
