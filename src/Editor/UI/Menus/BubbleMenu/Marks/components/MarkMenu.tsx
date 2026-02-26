import { Editor } from "@tiptap/react";
import { MarkBase } from "./MarkBase";
import Bold from "./Bold";
import Italic from "./Italic";
import Strike from "./Strike";
import Underline from "./Underline";
import { Code } from "./Code";
import { ButtonGroup } from "../../../../Components";

export default function MarkMenu({ editor }: { editor: Editor }) {
  return (
    <MarkBase editor={editor}>
      <ButtonGroup
        orientation="horizontal"
        style={{
          gap: '8px'
        }}
      >
        <Bold />
        <Italic />
        <Strike />
        <Underline />
        <Code />
      </ButtonGroup>
    </MarkBase>
  );
}