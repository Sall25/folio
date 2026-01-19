
import { Editor } from "@tiptap/react";
import { type Section } from "../navigation/types";

export function extractSections(editor: Editor) {
  const sections: Section[] = [];
  const doc = editor.state.doc;

  doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      sections.push({
        id: crypto.randomUUID(),
        title: node.textContent || 'Untitled',
        level: node.attrs.level,
        from: pos,
        to: pos + node.content.size
      });
    }
  });

  for (let i = 0; i < sections.length; i++) {
    const current = sections[i];
    const next = sections[i + 1];
    current.to = next ? next.from : doc.nodeSize - 2;
  }
  return sections;
}
