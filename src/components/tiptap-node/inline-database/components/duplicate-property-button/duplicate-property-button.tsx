import { Copy } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";

export function DuplicatePropertyButton({
  onDuplicate,
}: {
  onDuplicate: () => void;
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
      onClick={onDuplicate}
    >
      <Copy className="tiptap-button-icon" />
      <span className="tiptap-button-text">Duplicate property</span>
    </Button>
  );
}
