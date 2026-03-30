import * as React from "react";
import { Editor } from "@tiptap/react";
import { useCopyToClipboard } from "./use-copy-to-clipboard";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import "./copy-to-clipboard-button.scss";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Badge } from "@/components/tiptap-ui-primitive/badge";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import { ClipboardCopyIcon } from "@/components/tiptap-icons/clipboard-copy-icon";

// ─── Shortcut badge ────────────────────────────────────────────────────────────

function ShortcutBadge({ keys }: { keys: string }) {
  return <Badge>{keys}</Badge>;
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface CopyToClipboardButtonProps {
  /** The Tiptap editor instance. */
  editor?: Editor | null;
  /** Optional text label shown next to the icon. */
  text?: string;
  /** Preserve HTML formatting when copying. @default true */
  copyWithFormatting?: boolean;
  /** Hide the button when copying is not possible. @default false */
  hideWhenUnavailable?: boolean;
  /** Show a keyboard shortcut badge. @default false */
  showShortcut?: boolean;
  /** Callback fired after a successful copy. */
  onCopied?: () => void;
  /** How long (ms) the "copied" success state is shown. @default 2000 */
  resetDelay?: number;
  /** Extra class names forwarded to the button element. */
  className?: string;
  /** Override inline styles on the button. */
  style?: React.CSSProperties;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function CopyToClipboardButton({
  editor: providedEditor,
  text,
  copyWithFormatting = true,
  hideWhenUnavailable = false,
  showShortcut = false,
  onCopied,
  resetDelay = 2000,
  className,
  style,
}: CopyToClipboardButtonProps) {
  const { editor } = useTiptapEditor(providedEditor);
  const { isVisible, canCopy, isCopied, handleCopy, label, shortcutKeys } =
    useCopyToClipboard({
      editor,
      copyWithFormatting,
      hideWhenUnavailable,
      onCopied,
      resetDelay,
    });

  if (!isVisible) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleCopy}
      disabled={!canCopy}
      aria-label={label}
      aria-pressed={isCopied}
      data-copied={isCopied || undefined}
      className={[
        "tiptap-copy-btn",
        isCopied ? "is-copied" : "",
        canCopy ? "can-copy" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...style,
      }}
    >
      <ClipboardCopyIcon className="tiptap-button-icon" />
      {text !== undefined ? text : null}
      {showShortcut && (
        <>
          <Spacer orientation="horizontal" />
          <ShortcutBadge keys={shortcutKeys} />
        </>
      )}
    </Button>
  );
}

export default CopyToClipboardButton;
