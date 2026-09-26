import {
  Card,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { MessagesSquare } from "lucide-react";
import ColorDropdownMenu from "src/components/tiptap-ui/color-dropdown-menu";
import AlignmentDropdownMenu from "src/components/tiptap-ui/alignment-dropdown-menu";
import { TurnIntoDropdown } from "src/components/tiptap-ui/turn-into-dropdown";
import ResetFormattingButton from "src/components/tiptap-ui/reset-formatting-button";
import { DuplicateButton } from "src/components/tiptap-ui/duplicate-button";
import { CopyToClipboardButton } from "src/components/tiptap-ui/copy-to-clipboard-button";
import { CopyAnchorLinkButton } from "src/components/tiptap-ui/copy-anchor-link-button";
import { DeleteNodeButton } from "src/components/tiptap-ui/delete-node-button";

import "./menu.scss";
import { DropdownMenuItem } from "src/components/tiptap-ui-primitive/dropdown-menu";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { CommentButton } from "../comment-button";
import { useTranslation } from "react-i18next";
//import { RecordDragMenu } from "src/components/tiptap-node/inline-database/components/record-drag-menu";
import { useActivePageState } from "src/components/tiptap-templates/simple/context/active-page-context";
import { requestDiscussBlock } from "src/components/tiptap-templates/simple/components/chat/block-share-store";

const SNAPSHOT_MAX = 600;

// The block the drag handle selected — the node itself when it's a node
// selection, else the nearest ancestor. Only blocks with a UniqueID id can be
// shared (the id is what lets the chat jump back to it).
function getSelectedBlock(editor: Editor): { id: string; text: string } | null {
  const { selection } = editor.state;
  if (selection instanceof NodeSelection) {
    const id = selection.node.attrs?.id as string | undefined;
    if (id) return { id, text: selection.node.textContent };
  }
  const { $from } = selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    const id = node.attrs?.id as string | undefined;
    if (id) return { id, text: node.textContent };
  }
  return null;
}

export function Menu({
  title,
  editor,
  onAction,
  // target,
}: {
  title: string;
  editor: Editor;
  onAction?: () => void;
  /** NODE_LABELS value from the drag handle (e.g. "Record" for a
   *  databaseRecord row). Selects which menu to show. */
  target?: string;
}) {
  const { t } = useTranslation();
  const { activePageId, activePage } = useActivePageState();

  // if (target === "Record") {
  //   return <RecordDragMenu onAction={onAction} />;
  // }

  const block = activePageId ? getSelectedBlock(editor) : null;

  return (
    <Card className="menu">
      <CardGroupLabel className="title">{title}</CardGroupLabel>
      <CardItemGroup className="group" orientation="vertical">
        <DropdownMenuItem asChild>
          <ColorDropdownMenu
            className="menu-button"
            hideWhenUnavailable={true}
            editor={editor}
            onAction={onAction}
          />
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <AlignmentDropdownMenu
            className="menu-button"
            hideWhenUnavailable={true}
            editor={editor}
            onAction={onAction}
          />
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <TurnIntoDropdown hideWhenUnavailable={true} editor={editor} />
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <ResetFormattingButton
            text={t("blockMenu.resetFormatting")}
            hideWhenUnavailable={true}
            editor={editor}
            onResetAllFormatting={onAction}
          />
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <CommentButton
            style={{
              justifyContent: "flex-start",
            }}
            showTooltip={false}
            text="Comment"
            editor={editor}
            onClick={onAction}
          />
        </DropdownMenuItem>
        {block && activePageId && (
          <DropdownMenuItem asChild>
            <Button
              type="button"
              variant="ghost"
              style={{ justifyContent: "flex-start", width: "100%" }}
              onClick={() => {
                const text = block.text.trim().replace(/\s+/g, " ");
                requestDiscussBlock({
                  pageId: activePageId,
                  blockId: block.id,
                  snapshot:
                    text.length > SNAPSHOT_MAX
                      ? `${text.slice(0, SNAPSHOT_MAX)}…`
                      : text,
                  pageTitle: activePage?.title ?? "",
                });
                onAction?.();
              }}
            >
              <MessagesSquare className="tiptap-button-icon" />
              <span className="tiptap-button-text">
                {t("blockMenu.discussInChat", "Discuss in chat…")}
              </span>
            </Button>
          </DropdownMenuItem>
        )}
      </CardItemGroup>
      <Separator orientation="horizontal" />
      <CardItemGroup className="group" orientation="vertical">
        <DuplicateButton
          text={t("blockMenu.duplicateNode")}
          showShortcut={true}
          hideWhenUnavailable={false}
          editor={editor}
          onDuplicated={onAction}
        />
        <CopyToClipboardButton
          text={t("blockMenu.copyToClipboard")}
          showShortcut={true}
          hideWhenUnavailable={true}
          editor={editor}
          onCopied={onAction}
        />
        <CopyAnchorLinkButton
          text={t("blockMenu.copyAnchorLink")}
          showShortcut={true}
          hideWhenUnavailable={false}
          editor={editor}
          onCopied={onAction}
        />
      </CardItemGroup>
      <Separator orientation="horizontal" />

      <CardItemGroup className="group" orientation="vertical">
        <DeleteNodeButton
          showTooltip={false}
          showShortcut={true}
          text={t("blockMenu.deleteNode")}
          onDeleted={onAction}
          className="delete-node-button"
        />
      </CardItemGroup>
    </Card>
  );
}
