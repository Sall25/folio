import { useEffect } from "react";
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
import { useOpenRecord } from "../../../hooks/use-open-record";

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
  autoEdit,
  onEditingChange,
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
  autoEdit?: boolean;
  onEditingChange?: (editing: boolean) => void;
}) {
  const mutatePage = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const openRecord = useOpenRecord(view);

  // The title only. This used to also write `content`, rebuilt from the
  // row's cached copy of the page: that could put an old version of the
  // page over what its live document had saved since. The page's title
  // block follows the column when the page is next opened (useSyncDocTitle).
  function handleChange(next: string) {
    onChange(next);
    if (pageId) {
      mutatePage.mutate({ id: pageId, patch: { title: next } });
    }
  }

  useEffect(() => {
    if (record.title !== value) onChange(record.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.title]);

  const openPage = () => {
    if (!pageId || !view) return;
    openRecord(pageId);
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
        autoEdit={autoEdit}
        onEditingChange={onEditingChange}
      />
    </div>
  );
}
