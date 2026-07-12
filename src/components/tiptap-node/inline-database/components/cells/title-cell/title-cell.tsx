import { usePage } from "src/hooks/use-pages";
import type { JSONContent } from "@tiptap/core";
import { TitleCellDisplay } from "../../../primitives/title-cell-display";
import type { DatabaseView, ID } from "src/types";
import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";

/**
 * The title cell is an ATOM: page.title is the single source of truth.
 *
 * It used to be a content cell, which meant the same string existed in three
 * places — page.title, the databaseCell node's inline content, and
 * values[titlePropId] — with no working sync between them. Typing in the cell
 * wrote to values[] (which nothing reads); renaming the page never reached the
 * cell. Now the cell simply READS page.title and WRITES page.title. No copies,
 * nothing to keep in sync, and a rename anywhere shows up everywhere.
 */
export function TitleCell({
  value,
  pageId,
  templateId,
  readonly,
  unwrapped,
  view,
}: {
  value: string;
  recordId: ID;
  view?: DatabaseView;
  pageId?: ID;
  templateId?: ID;
  onChange: (value: string) => void;
  readonly?: boolean;
  unwrapped?: boolean;
}) {
  const { data: linkedPage } = usePage(pageId ?? null);
  const { data: templatePage } = usePage(templateId ?? null);
  const mutatePage = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const { setActivePageId } = useActivePage();
  const { setTarget } = usePageView();

  const icon = templatePage?.cover ?? linkedPage?.cover ?? null;

  function handleChange(next: string) {
    if (!linkedPage) return;

    // The page's title also appears as the first node of its content (the
    // editor's TitleNode), so both are patched together — the same thing the
    // sidebar's rename does.
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
      />
    </div>
  );
}
