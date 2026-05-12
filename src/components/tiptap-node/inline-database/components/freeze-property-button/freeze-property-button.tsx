import { Button } from "src/components/tiptap-ui-primitive/button";
import { Pin } from "lucide-react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

export function FreezePropertyButton({
  onFreeze,
  isFrozen,
}: {
  onFreeze: () => void;
  isFrozen: boolean;
}) {
  return (
    <Button
      variant="ghost"
      style={{
        width: "100%",
        height: 30,
        justifyContent: "flex-start",
        gap: 8,
      }}
      onClick={onFreeze}
    >
      <Pin className="tiptap-button-icon" />
      <span className="tiptap-button-text">
        {isFrozen ? "Unfreeze" : "Freeze"}
      </span>
      <Spacer orientation="horizontal" />
      {isFrozen && (
        <span
          className="tiptap-button-text"
          style={{
            color: "var(--tt-brand-color-400)",
          }}
        >
          On
        </span>
      )}
    </Button>
  );
}
