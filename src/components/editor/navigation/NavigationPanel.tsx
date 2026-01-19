import { Editor } from "@tiptap/react";
import { useState, useEffect } from "react";
import { type Section } from "./types";
import { extractSections } from "../utils/extractSections";
import { NavigationProvider } from "./NavigationProvider";
import { HoverArea } from "./HoverArea";

export interface NavigationPanelProps {
  editor: Editor;
}

export function NavigationPanel({ editor }: NavigationPanelProps) {
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      setSections(extractSections(editor));
    };

    editor.on('update', update);
    update();

    return () => {
      editor.off('update', update);
    }
  }, [editor]);

  return (
    <div className="fixed right-2 top-1/6">
      <NavigationProvider editor={editor} sections={sections}>
        <HoverArea />
      </NavigationProvider>
    </div>
  );
}