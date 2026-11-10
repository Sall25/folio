import {
  mutationOptions,
  useQueryClient,
  useMutation,
  type QueryClient,
} from "@tanstack/react-query";
import { useToast } from "src/features/shell/toast";
import { useTranslation } from "react-i18next";
import {
  trashPageMutationKey,
  trashPageOnServer,
  type TrashPageVars,
} from "src/lib/page-writes";
import {
  cachedSubtree,
  restoreDeletedAt,
  setCachedDeletedAt,
  type DeletedAtSnapshot,
} from "src/lib/page-trash-cache";
import { pageWritesScope } from "./use-patch-page";
import { RETRY_DELAY_MS, retryWhenOffline } from "src/lib/connectivity";
import { useRestorePage } from "./use-trash";
import type { ID } from "src/types";

// Moves a page (and the pages inside it) to the trash. Works offline: the
// pages leave the sidebar and show in the trash at once, and the server
// hears of it when the connection is back, in order with the other page
// writes, even after a reload (keyed under "pages", so it's saved with the
// cache). The toast's Undo restores it the same way.
export function useTrashPage() {
  const qc = useQueryClient();
  const { show } = useToast();
  const { t } = useTranslation();
  const restore = useRestorePage();

  const mutation = useMutation(
    trashPageMutationOptions(qc, (vars) =>
      show(t("trash.movedToast"), "success", {
        label: t("trash.undo"),
        onClick: () => restore.mutate(vars.pageId),
      }),
    ),
  );

  return {
    ...mutation,
    /** Takes the page's subtree from the cache, so it's known offline. */
    mutate: (vars: { pageId: ID; workspaceId: ID }) =>
      mutation.mutate({ ...vars, ids: cachedSubtree(qc, vars.pageId) }),
  };
}

/** useTrashPage's options, apart from React, so the offline tests run them
 *  on a QueryClient (offline-page-writes.test.ts). `onTrashed`: the toast. */
export function trashPageMutationOptions(
  qc: QueryClient,
  onTrashed?: (vars: TrashPageVars) => void,
) {
  return mutationOptions({
    mutationKey: trashPageMutationKey,
    scope: pageWritesScope,
    // A lost connection holds it until it's back (connectivity.ts).
    retry: retryWhenOffline,
    retryDelay: RETRY_DELAY_MS,
    mutationFn: trashPageOnServer,
    meta: { suppressErrorToast: false }, // network failures still toast via global handler
    onMutate: async (vars: TrashPageVars) => {
      await qc.cancelQueries({ queryKey: ["pages"] });
      const before = setCachedDeletedAt(
        qc,
        vars.ids ?? [vars.pageId],
        Date.now(),
      );
      onTrashed?.(vars);
      return { before };
    },
    onError: (_error, _vars, ctx?: { before: DeletedAtSnapshot }) => {
      if (ctx) restoreDeletedAt(qc, ctx.before);
    },
    onSettled: () => {
      if (qc.isMutating({ mutationKey: ["pages"] }) > 1) return;
      void qc.invalidateQueries({ queryKey: ["pages"] });
      void qc.invalidateQueries({ queryKey: ["trashed-pages"] });
    },
  });
}
