import type { Editor } from "@tiptap/core";
// import { ButtonGroup } from "src/components/tiptap-ui-primitive/button";
// import { COLORS } from "../../../tcolor-popover/data/colors";
// import { TextColorButton } from "../../../text-color-button";

interface ColorTextListProps {
  editor: Editor;
}

export function ColorTextList({ editor }: ColorTextListProps) {
  return (
    <></>
    // <ButtonGroup orientation="vertical">
    //   {COLORS.map((color, i) => (
    //     <TextColorButton
    //       key={i}
    //       editor={editor}
    //       textColor={color.css}
    //       onClick={(e) => {
    //         e.preventDefault()
    //         editor.chain().focus().toggleTextStyle({ color: color.css }).run();
    //       }}
    //     >
    //       A
    //     </TextColorButton>
    //   ))}
    // </ButtonGroup>
  );
}
