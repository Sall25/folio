import type { JSONContent } from "@tiptap/core";
import { usePage } from "src/hooks/use-pages";
import { TitleCellDisplay } from "../../../primitives/title-cell-display";
import type { DatabaseView, ID, Page } from "src/types";
import { usePageViewActions } from "src/components/tiptap-templates/simple/context/page-view-context";
import { useActivePageActions } from "src/components/tiptap-templates/simple/context/active-page-context";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { useNewRowEdit } from "../../../nodes/new-row-edit-context";

export function TitleCell({
  value,
  pageId,
  recordPage,
  templateId,
  readonly,
  unwrapped,
  view,
  openVariant,
  autoEdit,
  onEditingChange,
}: {
  value: string;
  recordId: ID;
  view?: DatabaseView;
  pageId?: ID;
  recordPage?: Page;
  templateId?: ID;
  onChange: (value: string) => void;
  readonly?: boolean;
  unwrapped?: boolean;
  openVariant?: "open" | "edit";
  autoEdit?: boolean;
  onEditingChange?: (editing: boolean) => void;
}) {
  // The record's page is the SAME page as pageId — the caller already has it in
  // resolvedRecords, so use it directly instead of re-fetching per row (that was
  // an N+1: one usePage per title cell = one fetch per row, refetching on every
  // view switch). Fall back to usePage only if no page was passed (defensive).
  const { data: fetchedPage } = usePage(recordPage ? null : (pageId ?? null));
  const linkedPage = recordPage ?? fetchedPage;

  // Templates are few and shared across rows, so this query dedupes by key —
  // one fetch per distinct template, not per row.
  const { data: templatePage } = usePage(templateId ?? null);

  const mutatePage = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const { setActivePageId } = useActivePageActions();
  const { setTarget } = usePageViewActions();

  const { editingRecordId, cancelEmptyRecord } = useNewRowEdit();
  const isNewlyCreated = editingRecordId != null && editingRecordId === pageId;

  const icon = templatePage?.cover ?? linkedPage?.cover ?? null;

  function handleChange(next: string) {
    if (!linkedPage) return;

    const content = linkedPage.content as JSONContent;
    const updatedContent: JSONContent = content?.content?.length
      ? {
          ...content,
          content: content.content.map((n, i) =>
            i !== 0
              ? n
              : { ...n, content: next ? [{ type: "text", text: next }] : [] },
          ),
        }
      : content;

    mutatePage.mutate({
      id: linkedPage.id,
      patch: { title: next, content: updatedContent },
    });
  }

  return (
    <div className="db-cell" data-wrap={unwrapped ? "false" : "true"}>
      <TitleCellDisplay
        value={value}
        onChange={handleChange}
        icon={icon}
        hasPage={pageId != null}
        onOpen={() => {
          if (pageId === null || pageId === undefined || !view) return;
          if (view.openPageIn === "Side") {
            setTarget({ pageId, view: "Peek" });
          } else if (view.openPageIn === "Center") {
            setTarget({ pageId, view: "Center" });
          } else if (view.openPageIn === "Full") {
            setActivePageId(pageId);
          } else if (view.type === "gallery" || view.type === "board") {
            setTarget({ pageId, view: "Center" });
          } else {
            setTarget({ pageId, view: "Peek" });
          }
        }}
        readonly={readonly}
        openVariant={openVariant}
        autoEdit={isNewlyCreated || autoEdit}
        onCancelEmpty={
          isNewlyCreated && pageId ? () => cancelEmptyRecord(pageId) : undefined
        }
        inline={view?.type !== "table" && view?.type !== "list"}
        onEditingChange={onEditingChange}
      />
    </div>
  );
}
