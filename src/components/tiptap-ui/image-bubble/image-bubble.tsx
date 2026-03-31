import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import type { Editor } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react/menus";
import { ImageAlignButton } from "src/components/tiptap-ui/image-align-button/image-align-button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { DeleteNodeButton } from "src/components/tiptap-ui/delete-node-button";
import CaptionButton from "src/components/tiptap-ui/caption-button";
import { NodeSelection } from "@tiptap/pm/state";
import ReplaceFigureButton from "src/components/tiptap-ui/replace-figure-button";

export function ImageBubble({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <BubbleMenu
      pluginKey={"imageAlignBubblePlugin"}
      editor={editor}
      shouldShow={({ editor, state }) => {
        const selection = state.selection;
        if (!(selection instanceof NodeSelection)) return false;

        if (editor.isActive("image") || editor.isActive("figure")) {
          return true;
        }
        return false;
      }}
    >
      <Card className="bubble-menu-content">
        <CardItemGroup orientation="horizontal">
          <ImageAlignButton
            hideWhenUnavailable={true}
            editor={editor}
            align="left"
            tooltip={"Align left"}
            showTooltip={true}
          />
          <ImageAlignButton
            hideWhenUnavailable={true}
            editor={editor}
            align="center"
            tooltip={"Align center"}
            showTooltip={true}
          />
          <ImageAlignButton
            hideWhenUnavailable={true}
            editor={editor}
            align="right"
            tooltip={"Align right"}
            showTooltip={true}
          />
          <Separator orientation="vertical" />
          <ReplaceFigureButton
            hideWhenUnavailable={true}
            editor={editor}
            showTooltip={true}
          />
          <CaptionButton
            hideWhenUnavailable={true}
            editor={editor}
            showTooltip={true}
          />
          <DeleteNodeButton editor={editor} showTooltip={true} />
        </CardItemGroup>
      </Card>
    </BubbleMenu>
  );
}
