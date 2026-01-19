import { Editor } from "@tiptap/react";

export type NavigationContextType = {
  hovered: boolean;
  showFloatingSections: () => void;
  hideFloatingSections: () => void;
  activeSection: Section | null;
  setCurrentSection: (section: Section) => void;
  sections: Section[];
  editor: Editor;
};

export type Level = '1' | '2' | '3' | '4';
export type Section = {
  id: string;
  title: string;
  level: Level;
  from: number;
  to: number;
};