import { useEffect } from "react";
import type { JSONContent } from "@tiptap/core";
import { TitleCellDisplay } from "../../../primitives/title-cell-display";
import type { ID, Page, PageCover } from "src/types";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";

export function TitleCell({
  value,
  record,
  pageId,
  onChange,
  readonly,
  unwrapped,
  icon,
}: {
  value: string;
  recordId: ID;
  record: Page;
  pageId?: ID;
  onChange: (value: string) => void;
  readonly?: boolean;
  unwrapped?: boolean;
  icon?: PageCover | null;
}) {
  const mutatePage = usePatchPage(({ id, patch }) => patchPage(id, patch));

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

  // page→cell: record.title is already in memory (bridge) — no query.
  useEffect(() => {
    if (record.title !== value) onChange(record.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.title]);

  return (
    <div className="db-cell" data-wrap={unwrapped ? "false" : "true"}>
      <TitleCellDisplay
        value={value}
        onChange={handleChange}
        icon={icon ?? null}
        readonly={readonly}
      />
    </div>
  );
}
