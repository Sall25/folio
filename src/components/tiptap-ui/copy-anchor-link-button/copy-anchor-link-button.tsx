// components/CopyAnchorLinkButton.tsx
import type { Editor } from "@tiptap/react";
import { useCopyAnchorLink } from "./use-copy-anchor-link";
import { Link, Check } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import "./copy-anchor-link-button.scss";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

function ShortcutBadge({ shortcutKeys }: { shortcutKeys: string }) {
  return (
    <Badge>
      <span>{shortcutKeys}</span>
    </Badge>
  );
}

interface Props {
  editor?: Editor | null;
  text?: string;
  hideWhenUnavailable?: boolean;
  onCopied?: () => void;
  onNodeIdNotFound?: (found: boolean) => void;
  onExtractedNodeId?: (id: string | null) => void;
  showShortcut?: boolean;
}

export function CopyAnchorLinkButton({
  editor: providedEditor,
  text,
  hideWhenUnavailable = false,
  onCopied,
  onNodeIdNotFound,
  onExtractedNodeId,
  showShortcut = false,
}: Props) {
  const { editor } = useTiptapEditor(providedEditor);

  const { isVisible, canCopy, copied, handleCopy } = useCopyAnchorLink({
    editor,
    hideWhenUnavailable,
    onCopied,
    onNodeIdNotFound,
    onExtractedNodeId,
  });

  if (!isVisible) return null;

  return (
    <Button
      variant="ghost"
      role="menuitem"
      onClick={handleCopy}
      disabled={hideWhenUnavailable && !canCopy}
      aria-label={copied ? "Link copied!" : "Copy anchor link"}
      title="Copy link to block (⌘⇧L)"
      className="anchor-link-btn"
      // className="flex items-center gap-1 px-2 py-1 rounded text-sm
      //            hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed
      //            transition-colors"
    >
      {copied ? (
        <Check className="tiptap-button-icon" />
      ) : (
        <Link className="tiptap-button-icon" />
      )}
      {text && <span>{copied ? "Copied!" : text}</span>}
      {showShortcut && (
        <>
          <Spacer orientation="horizontal" />
          <ShortcutBadge shortcutKeys="ModCtrL" />
        </>
      )}
    </Button>
  );
}
