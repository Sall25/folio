import { memo } from "react";
import { useTemplates } from "../../context/templates-context";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Shapes } from "lucide-react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

export const TemplatePaletteTrigger = memo(() => {
  const { onOpenChange, open } = useTemplates();

  return (
    <Button
      variant="ghost"
      size="large"
      style={{ width: "100%", justifyContent: "flex-start" }}
      onClick={() => onOpenChange?.(!open)}
    >
      <Shapes className="tiptap-button-icon" />
      <Spacer orientation="horizontal" size={2} />
      <span
        className="tiptap-button-text"
        style={{ opacity: 1, display: "block" }}
      >
        Templates
      </span>
    </Button>
  );
});
TemplatePaletteTrigger.displayName = "TemplatePaletteTrigger";
