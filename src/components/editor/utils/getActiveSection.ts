import { type Section } from "../navigation/types";
import { Editor } from "@tiptap/react";

export function getActiveSection(
  sections: Section[],
  editor: Editor
): Section | null {
  const pos = editor.state.selection.from;

  return (
    sections.find(
      section => pos >= section.from && pos <= section.to
    ) ?? null
  );
}