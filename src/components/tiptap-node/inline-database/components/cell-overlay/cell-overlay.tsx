import { useState } from "react";
import { Copy, Check, MessageSquareText } from "lucide-react";
import "./cell-overlay.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";

export function CellOverlay({
  copiable,
  getCopyText,
  onComment,
}: {
  /** Show the copy button (false for non-copiable types like status/select). */
  copiable: boolean;
  /** Lazily resolve the text to copy — called on click so it's always fresh. */
  getCopyText: () => string;
  /** Comment handler — wired later; the button shows regardless. */
  onComment?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const doCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = getCopyText();
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="db-cell-overlay" contentEditable={false} aria-hidden>
      <Button
        type="button"
        className="db-cell-overlay__btn"
        aria-label="Comment"
        tooltip="Comment"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onComment?.();
        }}
      >
        <MessageSquareText className="tiptap-button-icon" size={14} />
      </Button>
      {copiable && (
        <Button
          type="button"
          className="db-cell-overlay__btn"
          aria-label={copied ? "Copied" : "Copy"}
          tooltip={copied ? "Copied" : "Copy"}
          onClick={doCopy}
        >
          {copied ? (
            <Check className="tiptap-button-icon" size={14} />
          ) : (
            <Copy className="tiptap-button-icon" size={14} />
          )}
        </Button>
      )}
    </div>
  );
}
