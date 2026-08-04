import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "src/components/tiptap-templates/simple/components/toast";
import { trashPage, restorePage } from "src/api/pages-trash";
import { queryKeys } from "src/lib/queryKeys";

export function useTrashPage() {
  const qc = useQueryClient();
  const { show } = useToast();

  return useMutation({
    mutationFn: (pageId: string) => trashPage(pageId),
    meta: { suppressErrorToast: false }, // network failures still toast via global handler
    onSuccess: (_data, pageId) => {
      qc.invalidateQueries({ queryKey: queryKeys.pages.lists() });
      qc.invalidateQueries({ queryKey: ["trashed-pages"] });

      // Success toast with Undo → restore.
      show("Page moved to Trash", "success", {
        label: "Undo",
        onClick: () => {
          restorePage(pageId).then(() => {
            qc.invalidateQueries({ queryKey: ["pages"] });
            qc.invalidateQueries({ queryKey: ["trashed-pages"] });
          });
        },
      });
    },
  });
}
