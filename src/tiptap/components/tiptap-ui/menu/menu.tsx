import {
  Card,
  CardGroupLabel,
  CardItemGroup,
} from "@/components/tiptap-ui-primitive/card";
import { Separator } from "@/components/tiptap-ui-primitive/separator";
import type { Editor } from "@tiptap/core";
import ColorDropdownMenu from "@/components/tiptap-ui/color-dropdown-menu";
import AlignmentDropdownMenu from "@/components/tiptap-ui/alignment-dropdown-menu";
import { TurnIntoDropdown } from "@/components/tiptap-ui/turn-into-dropdown";
import ResetFormattingButton from "@/components/tiptap-ui/reset-formatting-button";
import { DuplicateButton } from "@/components/tiptap-ui/duplicate-button";
import { CopyToClipboardButton } from "@/components/tiptap-ui/copy-to-clipboard-button";
import { CopyAnchorLinkButton } from "@/components/tiptap-ui/copy-anchor-link-button";
import { DeleteNodeButton } from "@/components/tiptap-ui/delete-node-button";

import "./menu.scss";
import { DropdownMenuItem } from "@/components/tiptap-ui-primitive/dropdown-menu";
import { CommentButton } from "../comment-button";

export function Menu({
  title,
  editor,
  onAction,
}: {
  title: string;
  editor: Editor;
  onAction?: () => void;
}) {
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
            text="Reset formatting"
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
      </CardItemGroup>
      <Separator orientation="horizontal" />
      <CardItemGroup className="group" orientation="vertical">
        <DuplicateButton
          text="Duplicate node"
          showShortcut={true}
          hideWhenUnavailable={false}
          editor={editor}
          onDuplicated={onAction}
        />
        <CopyToClipboardButton
          text={"Copy to clipboard"}
          showShortcut={true}
          hideWhenUnavailable={true}
          editor={editor}
          onCopied={onAction}
        />
        <CopyAnchorLinkButton
          text={"Copy anchor link"}
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
          text="Delete node"
          onDeleted={onAction}
        />
      </CardItemGroup>
    </Card>
  );
}
