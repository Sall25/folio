import { X } from "lucide-react";
import { memo } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";

function ClearSelectionButtonImpl({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" tooltip="Clear selection" onClick={onClick}>
      <X className="tiptap-button-icon" size={16} />
    </Button>
  );
}

export const ClearSelectionButton = memo(ClearSelectionButtonImpl);
