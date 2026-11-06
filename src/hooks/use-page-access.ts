import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { ID, PageAccessGrant, PageRole, GeneralAccess } from "../types";
import { queryKeys } from "../lib/queryKeys";
import {
  fetchPageAccess,
  createPageAccess,
  patchPageAccess,
  deletePageAccess,
} from "../api/page-access";
import { setPageGeneralAccessTree } from "../api/page-access-tree";
import { useToast } from "src/features/shell/toast";

// The grants on a page (who's explicitly shared, and at what role).
export function usePageAccess(pageId: ID | null) {
  return useQuery({
    queryKey: queryKeys.pageAccess.list(pageId ?? ""),
    queryFn: () => fetchPageAccess(pageId!),
    enabled: pageId != null,
  });
}

// The share panel's actions: add / change-role / remove a grant, and set the
// page's general access. Each refetches on settle; a failure (e.g. refused by
// the server) says so instead of silently snapping back.
export function useManagePageAccess(pageId: ID) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { show } = useToast();
  const key = queryKeys.pageAccess.list(pageId);

  // Sharing changes who can do what — including you — so your own role and
  // the page lists (Shared section, sidebar) refresh too.
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["page-role", pageId] });
  };
  const onError = () => show(t("share.saveFailed"), "error");

  const share = useMutation({
    mutationFn: (grant: Omit<PageAccessGrant, "id" | "createdAt" | "pageId">) =>
      createPageAccess({ ...grant, pageId }),
    onError,
    onSettled: invalidate,
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: ID; role: PageRole }) =>
      patchPageAccess(id, role),
    onError,
    onSettled: invalidate,
  });

  const unshare = useMutation({
    mutationFn: (id: ID) => deletePageAccess(id),
    onError,
    onSettled: invalidate,
  });

  // General access lives on the Page row, not page_access. Set for the page
  // and every page inside it (sub-pages, database rows), so they follow it.
  const setGeneralAccess = useMutation({
    mutationFn: (next: {
      generalAccess: GeneralAccess;
      generalAccessRole: PageRole;
    }) =>
      setPageGeneralAccessTree(
        pageId,
        next.generalAccess,
        next.generalAccessRole,
      ),
    onError,
    onSettled: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: queryKeys.pages.detail(pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.pages.all });
    },
  });

  return { share, changeRole, unshare, setGeneralAccess };
}
