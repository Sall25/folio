import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "src/components/tiptap-templates/simple/components/toast";
import { trashPage, restorePage } from "src/api/pages-trash";
import { queryKeys } from "src/lib/queryKeys";
import type { ID } from "src/types";

export function useTrashPage() {
  const qc = useQueryClient();
  const { show } = useToast();

  return useMutation({
    mutationFn: ({
      pageId,
      workspaceId,
    }: {
      pageId: string;
      workspaceId: ID;
    }) => trashPage(pageId, workspaceId),
    meta: { suppressErrorToast: false }, // network failures still toast via global handler
    onSuccess: (_data, { pageId, workspaceId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.pages.lists(workspaceId) });
      qc.invalidateQueries({ queryKey: ["trashed-pages"] });

      // Success toast with Undo → restore.
      show("Page moved to Trash", "success", {
        label: "Undo",
        onClick: () => {
          restorePage(pageId, workspaceId).then(() => {
            qc.invalidateQueries({ queryKey: ["pages"] });
            qc.invalidateQueries({ queryKey: ["trashed-pages"] });
          });
        },
      });
    },
  });
}
