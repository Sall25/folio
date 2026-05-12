import { EyeOff } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";

export function HidePropertyButton({ onHide }: { onHide: () => void }) {
  return (
    <Button
      variant="ghost"
      style={{
        width: "100%",
        height: 30,
        justifyContent: "flex-start",
        gap: 8,
      }}
      onClick={onHide}
    >
      <EyeOff className="tiptap-button-icon" />
      <span className="tiptap-button-text">Hide in view</span>
    </Button>
  );
}
