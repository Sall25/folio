import { ChevronRight, type LucideIcon } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

export function PropertyMenuRow({
  icon: Icon,
  label,
  value,
  navigable,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  navigable?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      style={{ justifyContent: "flex-start", width: "100%", gap: 8 }}
    >
      <Icon className="tiptap-button-icon" />
      <span className="tiptap-button-text">{label}</span>
      <Spacer orientation="horizontal" />
      {value && <span className="db-prop-menu__value">{value}</span>}
      {navigable && (
        <ChevronRight className="tiptap-button-icon-sub" size={14} />
      )}
    </Button>
  );
}
