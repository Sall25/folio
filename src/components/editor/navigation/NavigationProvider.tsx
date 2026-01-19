import { type ReactNode } from "react";
import { Editor } from "@tiptap/react";
import { type Section } from "./types";
import { useState } from "react";
import { getActiveSection } from "../utils/getActiveSection";
import { useEffect } from "react";
import { NavigationContext } from "./navigationContext";

export interface NavigationProviderProps {
  children: ReactNode;
  editor: Editor;
  sections: Section[];
}

export function NavigationProvider({ children, editor, sections }: NavigationProviderProps) {
  const [hovered, setHovered] = useState(false);
  const [activeSection, setActiveSection] = useState<Section | null>(null);

  useEffect(() => {
    if (!editor) return;

    const updateActive = () => {
      setActiveSection(getActiveSection(sections, editor));
    };

    editor.on('selectionUpdate', updateActive);
    editor.on('update', updateActive);

    updateActive();

    return () => {
      editor.off('selectionUpdate', updateActive);
      editor.off('update', updateActive);
    };
  }, [editor, sections]);

  const showFloatingSections = () => setHovered(true);
  const hideFloatingSections = () => setHovered(false);
  const setCurrentSection = (section: Section) => setActiveSection(section);

  return (
    <NavigationContext.Provider value={{
      hovered,
      showFloatingSections,
      hideFloatingSections,
      activeSection,
      setCurrentSection,
      sections,
      editor
    }}>
      {children}
    </NavigationContext.Provider>
  );
}
