import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ID, PageAccessGrant, PageRole, GeneralAccess } from "../types";
import { queryKeys } from "../lib/queryKeys";
import {
  fetchPageAccess,
  createPageAccess,
  patchPageAccess,
  deletePageAccess,
} from "../api/page-access";
import { patchPage } from "../api/pages";

// The grants on a page (who's explicitly shared, and at what role).
export function usePageAccess(pageId: ID | null) {
  return useQuery({
    queryKey: queryKeys.pageAccess.list(pageId ?? ""),
    queryFn: () => fetchPageAccess(pageId!),
    enabled: pageId != null,
  });
}

// The share panel's actions: add / change-role / remove a grant, and set the
// page's general access. All optimistic-invalidate on settle.
export function useManagePageAccess(pageId: ID) {
  const qc = useQueryClient();
  const key = queryKeys.pageAccess.list(pageId);
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const share = useMutation({
    mutationFn: (grant: Omit<PageAccessGrant, "id" | "createdAt" | "pageId">) =>
      createPageAccess({ ...grant, pageId }),
    onSettled: invalidate,
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: ID; role: PageRole }) =>
      patchPageAccess(id, role),
    onSettled: invalidate,
  });

  const unshare = useMutation({
    mutationFn: (id: ID) => deletePageAccess(id),
    onSettled: invalidate,
  });

  // General access lives on the Page row, not page_access — patch the page.
  const setGeneralAccess = useMutation({
    mutationFn: (patch: {
      generalAccess?: GeneralAccess;
      generalAccessRole?: PageRole;
    }) => patchPage(pageId, patch),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pages.detail(pageId) });
    },
  });

  return { share, changeRole, unshare, setGeneralAccess };
}
