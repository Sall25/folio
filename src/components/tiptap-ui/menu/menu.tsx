import {
  Card,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import type { Editor } from "@tiptap/core";
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
import { CommentButton } from "../comment-button";
import { useTranslation } from "react-i18next";

export function Menu({
  title,
  editor,
  onAction,
}: {
  title: string;
  editor: Editor;
  onAction?: () => void;
}) {
  const { t } = useTranslation();
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
            text={t("blockMenu.resetFormatting")} //"Reset formatting"
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
