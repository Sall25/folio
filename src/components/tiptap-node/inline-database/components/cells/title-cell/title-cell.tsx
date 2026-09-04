import { useEffect } from "react";
import type { JSONContent } from "@tiptap/core";
import { TitleCellDisplay } from "../../../primitives/title-cell-display";
import type {
  DatabaseView,
  ID,
  Page,
  PageCover,
  PropertyConfig,
} from "src/types";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";

export function TitleCell({
  value,
  record,
  pageId,
  onChange,
  readonly,
  unwrapped,
  icon,
  config,
  view,
}: {
  value: string;
  recordId: ID;
  record: Page;
  pageId?: ID;
  onChange: (value: string) => void;
  readonly?: boolean;
  unwrapped?: boolean;
  icon?: PageCover | null;
  config?: Extract<PropertyConfig, { type: "title" }>;
  view?: DatabaseView;
}) {
  const mutatePage = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const { setTarget } = usePageView();
  const { setActivePageId } = useActivePage();

  function handleChange(next: string) {
    onChange(next);
    if (pageId) {
      const content = record.content as JSONContent;
      const updatedContent: JSONContent = content?.content?.length
        ? {
            ...content,
            content: content.content.map((n, i) =>
              i !== 0 ? n : { ...n, content: [{ type: "text", text: next }] },
            ),
          }
        : content;
      mutatePage.mutate({
        id: pageId,
        patch: { title: next, content: updatedContent },
      });
    }
  }

  useEffect(() => {
    if (record.title !== value) onChange(record.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.title]);

  const openPage = () => {
    if (!pageId || !view) return;
    if (view.openPageIn === "Side") setTarget({ pageId, view: "Peek" });
    else if (view.openPageIn === "Center")
      setTarget({ pageId, view: "Center" });
    else if (view.openPageIn === "Full") setActivePageId(pageId);
    else if (view.type === "gallery" || view.type === "board")
      setTarget({ pageId, view: "Center" });
    else setTarget({ pageId, view: "Peek" });
  };

  // Table edits via popover; every other view edits inline.
  const variant = view?.type === "table" ? "popover" : "inline";

  return (
    <div className="db-cell" data-wrap={unwrapped ? "false" : "true"}>
      <TitleCellDisplay
        value={value}
        onChange={handleChange}
        icon={icon ?? null}
        readonly={readonly}
        showPageIcon={config?.showPageIcon ?? true}
        variant={variant} //"popover" //{variant}
        onOpen={openPage}
      />
    </div>
  );
}
