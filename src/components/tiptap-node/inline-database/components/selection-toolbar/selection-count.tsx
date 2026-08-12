import { memo } from "react";

function SelectionCountImpl({ count }: { count: number }) {
  return <span className="db-selection-toolbar__count">{count} selected</span>;
}

export const SelectionCount = memo(SelectionCountImpl);
