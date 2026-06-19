import { useEffect } from "react";
import { usePage } from "src/hooks/use-pages";
import type { JSONContent } from "@tiptap/core";
import { TitleCellDisplay } from "../../../primitives/title-cell-display";
import type { DatabaseView, ID } from "src/types";
import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";

export function TitleCell({
  value,
  // recordId,
  pageId,
  templateId,
  onChange,
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
    //  registry value
    onChange(next);
    //  linked page title + its content's title node
    if (linkedPage) {
      const content = linkedPage.content as JSONContent;
      const updatedContent: JSONContent = content.content?.length
        ? {
            ...content,
            content: content.content.map((n, i) =>
              i !== 0 ? n : { ...n, content: [{ type: "text", text: next }] },
            ),
          }
        : content;
      mutatePage.mutate({
        id: linkedPage.id,
        patch: { title: next, content: updatedContent },
      });
    }
  }

  // inside TitleCell, after linkedPage is computed:
  useEffect(() => {
    if (!linkedPage) return;
    // page→cell: if the page title diverged from the cell value, sync it back
    if (linkedPage.title !== value) {
      onChange(linkedPage.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedPage?.title]);

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
          } else {
            if (view.type === "list") {
              setTarget({ pageId, view: "Peek" });
            } else if (view.type === "gallery" || view.type == "board") {
              setTarget({ pageId, view: "Center" });
            }
            {
              setTarget({ pageId, view: "Peek" });
            }
          }
        }}
        readonly={readonly}
      />
    </div>
  );
}
