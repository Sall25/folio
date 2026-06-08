import { useEffect, useMemo } from "react";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { usePeekPage } from "src/components/tiptap-templates/simple/context/peek-page-context";
import { findPage } from "src/lib/find-page";
import type { JSONContent } from "@tiptap/core";
import { TitleCellDisplay } from "../../../primitives/title-cell-display";
import type { DatabaseView, ID } from "../../../types/types";
import { useCreatePage } from "src/components/tiptap-templates/simple/context/create-page-context";
import { useActivePage } from "src/components/tiptap-templates/simple/use-active-page";

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
  pageId?: number;
  templateId?: number;
  onChange: (value: string) => void;
  readonly?: boolean;
  unwrapped?: boolean;
}) {
  const { pages, updatePageAsync } = usePages();
  const { setActivePageId } = useActivePage();
  const { setPeekPageId } = usePeekPage();
  const { setCreatePageId } = useCreatePage();

  const linkedPage = useMemo(
    () => (pageId != null && pages ? (findPage(pages, pageId) ?? null) : null),
    [pages, pageId],
  );
  const templatePage = useMemo(
    () => (templateId && pages ? (findPage(pages, templateId) ?? null) : null),
    [pages, templateId],
  );

  const icon = templatePage?.cover ?? linkedPage?.cover ?? null;

  function handleChange(next: string) {
    // 1. registry value
    onChange(next);
    // 2. linked page title + its content's title node
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
      updatePageAsync({ ...linkedPage, title: next, content: updatedContent });
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
            setPeekPageId(pageId);
          } else if (view.openPageIn === "Center") {
            setCreatePageId(pageId);
          } else if (view.openPageIn === "Full") {
            setActivePageId(pageId);
          } else {
            if (view.type === "list") {
              setPeekPageId(pageId);
            } else if (view.type === "gallery") {
              setCreatePageId(pageId);
            } else if (view.type === "board") {
              setCreatePageId(pageId);
            } else {
              setPeekPageId(pageId);
            }
          }
        }}
        readonly={readonly}
      />
    </div>
  );
}
