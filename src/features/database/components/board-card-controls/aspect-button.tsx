import { Frame } from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";

export function AspectButton({ onAspect }: { onAspect: () => void }) {
  return (
    <Button
      variant="ghost"
      className="db-card-controls__btn"
      tooltip="Cover fit"
      onClick={(e) => {
        e.stopPropagation();
        onAspect();
      }}
    >
      <Frame className="tiptap-button-icon" size={14} />
    </Button>
  );
}
