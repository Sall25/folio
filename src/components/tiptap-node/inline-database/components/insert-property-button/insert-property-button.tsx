import { InsertLeftIcon } from "src/components/tiptap-icons/insert-left-icon";
import { InsertRightIcon } from "src/components/tiptap-icons/insert-right-icon";
import { Button } from "src/components/tiptap-ui-primitive/button";

export function InsertPropertyButton({
  side,
  onInsert,
}: {
  side: "left" | "right";
  onInsert: () => void;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onInsert}
      style={{ justifyContent: "flex-start", width: "100%", gap: 8 }}
    >
      {side === "left" ? (
        <InsertLeftIcon className="tiptap-button-icon" />
      ) : (
        <InsertRightIcon className="tiptap-button-icon" />
      )}
      <span className="tiptap-button-text">Insert {side}</span>
    </Button>
  );
}
