import { Editor } from "@tiptap/react";
import { MarkBase } from "./MarkBase";
import Bold from "./Bold";
import Italic from "./Italic";
import Strike from "./Strike";
import Underline from "./Underline";
import { Code } from "./Code";

export default function MarkMenu({ editor }: { editor: Editor }) {
  return (
    <MarkBase editor={editor}>
      <Bold />
      <Italic />
      <Strike />
      <Underline />
      <Code />
    </MarkBase>
  );
}