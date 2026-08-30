import "./menu-row.scss";

// ─── MenuRow ────────────────────────────────────────────────────────────────
// The shared presentational row for action menus and option panels.
//
//   - ACTION row (default): a ghost <Button> — icon + label, optional shortcut /
//     sub / submenu chevron / danger, fires onClick.
//   - TOGGLE row (pass `toggle`): the label renders as the SAME ghost Button (so
//     it matches action rows exactly), with a Toggle as a sibling. Clicking the
//     row toggles; the Toggle reflects state. Button + sibling Toggle (not
//     nested) avoids nested-interactive / double-fire.
//   - SELECT row (pass `selected`): a ghost <Button> with a trailing check.
import { Check, ChevronRight } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Toggle } from "src/components/tiptap-ui-primitive/toggle";

type IconType = ComponentType<{
  className?: string;
  size?: number;
  fill?: string;
  stroke?: string;
}>;

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
  toggle,
  checked,
  onToggle,
  selected,
}: {
  Icon?: IconType;
  filled?: boolean;
  label: string;
  shortcut?: string;
  navigable?: boolean;
  sub?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  toggle?: boolean;
  checked?: boolean;
  onToggle?: () => void | Promise<void>;
  selected?: boolean;
}) {
  const iconEl: ReactNode = Icon ? (
    filled ? (
      <Icon
        key="icon-filled"
        className="tiptap-button-icon"
        size={16}
        fill="var(--tt-brand-color-500)"
        stroke="var(--tt-brand-color-500)"
      />
    ) : (
      <Icon key="icon" className="tiptap-button-icon" size={16} />
    )
  ) : null;

  // ── Toggle row: ghost Button (for identical styling) + sibling Toggle. ────
  if (toggle) {
    return (
      <CardItemGroup
        className="db-menu-row--toggle"
        orientation="horizontal"
        style={{ width: "100%" }}
      >
        <Button
          variant="ghost"
          role="menuitem"
          disabled={disabled}
          onClick={() => {
            if (!disabled) void onToggle?.();
          }}
          style={{
            width: "100%",
            justifyContent: "flex-start",
            borderRadius: "var(--tt-radius-sm)",
            background: "transparent",
          }}
        >
          {iconEl}
          <span className="tiptap-button-text">{label}</span>
          <Spacer orientation="horizontal" />
          {sub && <span className="db-actions-menu__shortcut">{sub}</span>}
        </Button>
        <Toggle
          checked={!!checked}
          onChangeAsync={async () => {
            if (disabled) return;
            await onToggle?.();
          }}
        />
      </CardItemGroup>
    );
  }

  // ── Action / select row. ──────────────────────────────────────────────────
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
      {iconEl}
      <span className="tiptap-button-text">{label}</span>
      <Spacer orientation="horizontal" />
      {shortcut && (
        <span className="db-actions-menu__shortcut">{shortcut}</span>
      )}
      {sub && <span className="db-actions-menu__shortcut">{sub}</span>}
      {selected && <Check className="tiptap-button-icon-sub" size={14} />}
      {navigable && (
        <ChevronRight className="tiptap-button-icon-sub" size={14} />
      )}
    </Button>
  );
}
