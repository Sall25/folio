import { useState } from "react";
import { Copy, Check, MessageSquareText, PanelRightOpen } from "lucide-react";
import "./cell-overlay.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";

export function CellOverlay({
  copiable,
  getCopyText,
  onComment,
  onOpen,
}: {
  copiable: boolean;
  getCopyText: () => string;
  onComment?: () => void;
  /** When set, renders an "Open page" button (used for the title cell). */
  onOpen?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (onOpen)
    return (
      <Button
        type="button"
        className="db-cell-overlay-open"
        aria-label="Open page"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpen();
        }}
      >
        <PanelRightOpen className="tiptap-button-icon" size={14} />
        <span className="tiptap-button-text">Open</span>
      </Button>
    );

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
    <div
      className="db-cell-overlay"
      style={{ width: onOpen ? "fit-content" : "auto" }}
      contentEditable={false}
      aria-hidden
    >
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
