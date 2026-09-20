import { memo } from "react";
import { useTemplates } from "../../context/templates-context";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Shapes } from "lucide-react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { useEditorLayoutActions } from "../../context/editor-layout-context";

export const TemplatePaletteTrigger = memo(() => {
  const { onOpenChange, open } = useTemplates();
  const isMobile = useIsMobile();
  const { onCollapsedChange } = useEditorLayoutActions();

  return (
    <Button
      variant="ghost"
      size="large"
      style={{ width: "100%", justifyContent: "flex-start" }}
      onClick={() => {
        onOpenChange?.(!open);
        onCollapsedChange(isMobile);
      }}
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
