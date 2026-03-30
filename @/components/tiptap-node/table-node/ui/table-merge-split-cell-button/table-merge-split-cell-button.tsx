import { Button } from "@/components/tiptap-ui-primitive/button";
import { useMergeCells } from "./use-merge-split";
import { MergeIcon, SplitIcon } from "@/components/tiptap-icons";

export function TableMergeOrSplitCellButton({
  onAction,
  className,
}: {
  onAction?: () => void;
  className?: string;
}) {
  const { canMerge, canSplit, split, merge } = useMergeCells();

  if (!canMerge && !canSplit) return null;

  return (
    <Button
      variant="ghost"
      tabIndex={-1}
      className={className}
      onClick={() => {
        if (canMerge) {
          merge();
        } else {
          split();
        }
        onAction?.();
      }}
    >
      {canMerge && <MergeIcon className="tiptap-button-icon" />}
      {canSplit && <SplitIcon className="tiptap-button-icon" />}
      {canMerge && <span>Merge Cells</span>}
      {canSplit && <span>Split Cells</span>}
    </Button>
  );
}
