import { WrapText } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

export function UnwrapPropertyButton({
  onUnwrap,
  isUnwrapped,
}: {
  onUnwrap: () => void;
  isUnwrapped: boolean;
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
      onClick={() => {
        onUnwrap();
      }}
    >
      <WrapText className="tiptap-button-icon" />
      <span className="tiptap-button-text">Unwrap content</span>
      <Spacer orientation="horizontal" />
      {isUnwrapped && (
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
