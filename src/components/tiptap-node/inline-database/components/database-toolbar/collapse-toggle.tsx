import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { memo } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";

function CollapseToggleImpl({
  collapsed,
  visible,
  onToggle,
}: {
  collapsed: boolean;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="large"
      tooltip={collapsed ? "Show toolbar" : "Hide toolbar"}
      onClick={onToggle}
      style={{
        background: "transparent",
        padding: 0,
        // Always interactive when collapsed — it's the only way back.
        opacity: visible || collapsed ? 1 : 0,
        pointerEvents: visible || collapsed ? "auto" : "none",
        transition: "opacity 0.15s ease",
      }}
    >
      {collapsed ? (
        <ChevronsLeft
          className="tiptap-button-icon"
          style={{ width: 28, height: 24 }}
          strokeWidth={1}
        />
      ) : (
        <ChevronsRight
          className="tiptap-button-icon"
          style={{ width: 28, height: 24 }}
          strokeWidth={1}
        />
      )}
    </Button>
  );
}

export const CollapseToggle = memo(CollapseToggleImpl);
