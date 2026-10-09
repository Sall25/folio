import {
  Card,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { Columns2, MessagesSquare } from "lucide-react";
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
import { CommentButton } from "../../../features/comments/comment-button";
import { useTranslation } from "react-i18next";
//import { RecordDragMenu } from "src/features/database/components/record-drag-menu";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import { requestDiscussBlock } from "src/features/chat/block-share-store";
import { SuggestButton } from "../../../features/comments/suggest-button";
import { MoveToDropdown } from "src/components/tiptap-ui/move-to-dropdown";
import {
  countSelectedBlocks,
  getSelectedBlocks,
} from "src/lib/block-selection";

const SNAPSHOT_MAX = 600;

// The block the drag handle selected is a columns block, or sits inside one:
// offer to unwrap the columns. Read when the menu opens (it renders on
// open), so no editor listener is needed.
function isColumnsBlock(editor: Editor): boolean {
  const { selection } = editor.state;
  if (
    selection instanceof NodeSelection &&
    selection.node.type.name === "columnBlock"
  ) {
    return true;
  }
  // A block selection: only when it's that one columns block.
  const blocks = getSelectedBlocks(selection);
  if (blocks) {
    return blocks.length === 1 && blocks[0].node.type.name === "columnBlock";
  }
  const { $from } = selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === "columnBlock") return true;
  }
  return false;
}

// The block the drag handle selected — the node itself when it's a node
// selection, else the nearest ancestor. Only blocks with a UniqueID id can be
// shared (the id is what lets the chat jump back to it).
function getSelectedBlock(editor: Editor): { id: string; text: string } | null {
  const { selection } = editor.state;
  if (selection instanceof NodeSelection) {
    const id = selection.node.attrs?.id as string | undefined;
    if (id) return { id, text: selection.node.textContent };
  }
  // A block selection: shared when it's one block (a discussion points at
  // one block).
  const blocks = getSelectedBlocks(selection);
  if (blocks) {
    const node = blocks.length === 1 ? blocks[0].node : null;
    const id = node?.attrs?.id as string | undefined;
    return node && id ? { id, text: node.textContent } : null;
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
  // Optional: the block menu also opens on the landing, where there's no
  // page — comment, suggest and discuss need one, so they hide there.
  const { activePageId, activePage } = useOptionalActivePage();

  // if (target === "Record") {
  //   return <RecordDragMenu onAction={onAction} />;
  // }

  const block = activePageId ? getSelectedBlock(editor) : null;
  // Opened on a selection of several blocks (drag-box, Shift+click on
  // grips): every action applies to all of them; the ones made for a
  // single block (suggest an edit, copy its link) are left out.
  const blockCount = countSelectedBlocks(editor.state.selection);
  const several = blockCount > 1;

  return (
    <Card className="menu">
      <CardGroupLabel className="title">
        {several ? t("blockMenu.blocksSelected", { count: blockCount }) : title}
      </CardGroupLabel>
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
        {isColumnsBlock(editor) && (
          <DropdownMenuItem asChild>
            <Button
              type="button"
              variant="ghost"
              className="menu-button"
              style={{ justifyContent: "flex-start", width: "100%" }}
              onClick={() => {
                editor.chain().focus().unwrapColumns().run();
                onAction?.();
              }}
            >
              <Columns2 className="tiptap-button-icon" />
              <span className="tiptap-button-text">
                {t("blockMenu.unwrapColumns", "Unwrap columns")}
              </span>
            </Button>
          </DropdownMenuItem>
        )}
        {activePageId && (
          <DropdownMenuItem asChild>
            <MoveToDropdown editor={editor} onAction={onAction} />
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <ResetFormattingButton
            text={t("blockMenu.resetFormatting")}
            hideWhenUnavailable={true}
            editor={editor}
            onResetAllFormatting={onAction}
          />
        </DropdownMenuItem>
        {activePageId && (
          <>
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
            {!several && (
              <DropdownMenuItem asChild>
                <SuggestButton
                  style={{
                    justifyContent: "flex-start",
                  }}
                  showTooltip={false}
                  text="Suggest"
                  editor={editor}
                  onClick={onAction}
                />
              </DropdownMenuItem>
            )}
          </>
        )}
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
        {!several && (
          <CopyAnchorLinkButton
            text={t("blockMenu.copyAnchorLink")}
            showShortcut={true}
            hideWhenUnavailable={false}
            editor={editor}
            onCopied={onAction}
          />
        )}
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
