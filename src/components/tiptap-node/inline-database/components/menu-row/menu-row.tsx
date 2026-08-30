import "./menu-row.scss";

// ─── MenuRow ────────────────────────────────────────────────────────────────
// The shared presentational row for action menus. Extracted from
// SelectionActionsMenu so the SAME record-action items can be composed into BOTH
// SelectionActionsMenu (board/gallery) and the drag-handle Menu (table/list). A
// row is pure presentation: icon, label, optional shortcut / submenu chevron /
// danger styling, and an onClick — no editor, no record knowledge.
import { ChevronRight } from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

export function MenuRow({
  Icon,
  label,
  shortcut,
  navigable,
  sub,
  onClick,
  danger,
  filled,
  disabled,
}: {
  Icon: ComponentType<{
    className?: string;
    size?: number;
    fill?: string;
    stroke?: string;
  }>; //LucideIcon;
  filled?: boolean;
  label: string;
  shortcut?: string;
  navigable?: boolean;
  sub?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={danger ? "tiptap-button-delete" : undefined}
      style={{
        width: "100%",
        justifyContent: "flex-start",
        borderRadius: "var(--tt-radius-sm)",
      }}
    >
      {filled ? (
        <Icon
          key={"icon-filled"}
          className="tiptap-button-icon"
          size={16}
          fill="var(--tt-brand-color-500)"
          stroke="var(--tt-brand-color-500)"
        />
      ) : (
        <Icon key={"icon"} className="tiptap-button-icon" size={16} />
      )}
      <span className="tiptap-button-text">{label}</span>
      <Spacer orientation="horizontal" />
      {shortcut && (
        <span className="db-actions-menu__shortcut">{shortcut}</span>
      )}
      {sub && <span className="db-actions-menu__shortcut">{sub}</span>}
      {navigable && (
        <ChevronRight className="tiptap-button-icon-sub" size={14} />
      )}
    </Button>
  );
}
