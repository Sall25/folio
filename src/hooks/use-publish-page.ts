import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { ID } from "src/types";
import { queryKeys } from "src/lib/queryKeys";
import { fetchPublishedPage, setPagePublished } from "src/api/pages";
import { useToast } from "src/features/shell/toast";
import { appUrl } from "src/lib/app-url";

export const publishedPageKey = (id: ID) => ["published-page", id] as const;

/** The public address of a published page. */
export function publishedPageUrl(id: ID): string {
  return appUrl(`/p/${id}`);
}

/** A published page as visitors see it (works signed out). */
export function usePublishedPage(id: ID | null) {
  return useQuery({
    queryKey: publishedPageKey(id ?? ""),
    queryFn: () => fetchPublishedPage(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/** Publish / unpublish a page, with or without its subpages. The page row
 *  (publishedAt, publishSubpages) refreshes afterwards. */
export function usePublishPage(pageId: ID) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { show } = useToast();

  return useMutation({
    mutationFn: ({
      published,
      includeSubpages = false,
    }: {
      published: boolean;
      includeSubpages?: boolean;
    }) => setPagePublished(pageId, published, includeSubpages),
    onSuccess: (_data, { published }) =>
      show(
        published ? t("publish.published") : t("publish.unpublished"),
        "success",
      ),
    onError: () => show(t("publish.failed"), "error"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pages.detail(pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.pages.all });
      qc.invalidateQueries({ queryKey: publishedPageKey(pageId) });
    },
  });
}
