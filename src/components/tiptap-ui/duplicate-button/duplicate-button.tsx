// ─── Component ─────────────────────────────────────────────────────────────────
import { useState } from "react";
import type { Editor } from "@tiptap/core";
import type { CSSProperties } from "react";

import { useDuplicate } from "./use-duplicate";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import { CheckIcon } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

const styles = {
  button: {
    fontFamily: "var(--font-ui)",
    justifyContent: "flex-start",
  },
  buttonHover: {},
  buttonDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  buttonActive: {
    transform: "scale(0.97)",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 5px",
    fontSize: "11px",
    fontWeight: 400,
    borderRadius: "4px",
    letterSpacing: "0.02em",
  },
};

function ShortcutBadge({ shortcutKeys }: { shortcutKeys: string }) {
  return (
    <Badge>
      <span>{shortcutKeys}</span>
    </Badge>
  );
}

/**
 * <DuplicateButton />
 *
 * Props:
 *   editor               — Tiptap Editor instance
 *   text                 — optional label (default: none, icon only)
 *   hideWhenUnavailable  — hide the button when duplication not possible
 *   showShortcut         — show ⌘D keyboard shortcut badge
 *   onDuplicated         — callback fired after success
 *   className            — extra CSS class for the button
 *   style                — extra inline styles
 */

interface DuplicateButtonProps {
  editor?: Editor | null;
  text?: string;
  hideWhenUnavailable?: boolean;
  showShortcut?: boolean;
  onDuplicated?: () => void;
  className?: string;
  style?: Partial<CSSProperties>;
}

export function DuplicateButton({
  editor: providedEditor,
  text,
  hideWhenUnavailable = false,
  showShortcut = false,
  onDuplicated,
  className = "",
  style = {},
}: DuplicateButtonProps) {
  const { editor } = useTiptapEditor(providedEditor);

  const {
    isVisible,
    canDuplicate,
    handleDuplicate,
    label,
    shortcutKeys,
    Icon,
  } = useDuplicate({ editor, hideWhenUnavailable, onDuplicated });

  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);

  if (!isVisible) return null;

  const handleClick = () => {
    //if (!canDuplicate) return;
    const success = handleDuplicate();
    if (success) {
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    }
  };

  const computedStyle = {
    ...styles.button,
    ...(hover && canDuplicate ? styles.buttonHover : {}),
    ...(!canDuplicate && hideWhenUnavailable ? styles.buttonDisabled : {}),
    ...(active ? styles.buttonActive : {}),
    ...style,
  };

  return (
    <Button
      type="button"
      role="menuitem"
      variant="ghost"
      aria-label={label}
      title={`${label}${showShortcut ? " (ModD)" : ""}`}
      disabled={hideWhenUnavailable && !canDuplicate}
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setActive(false);
      }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      className={className}
      style={computedStyle as Partial<CSSProperties>}
    >
      {done ? (
        <CheckIcon className="tiptap-button-icon" />
      ) : (
        <Icon className="tiptap-button-icon" />
      )}
      {text && <span>{text}</span>}

      {showShortcut && (
        <>
          <Spacer orientation="horizontal" />
          <ShortcutBadge shortcutKeys={shortcutKeys} />
        </>
      )}
      {/* {showShortcut && <span style={styles.badge}>{shortcutKeys}</span>} */}
    </Button>
  );
}
