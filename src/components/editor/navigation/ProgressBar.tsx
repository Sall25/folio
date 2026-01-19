import { type Section } from "./types";
import { Editor } from "@tiptap/react";
import { NavigationContext } from "./navigationContext";
import { useContext } from "react";
import { getActiveSection } from "../utils/getActiveSection";
import { Indicator } from "./Indicator";

export interface ProgressBarProps {
  sections: Section[];
  editor: Editor;
}


export function ProgressBar({ sections, editor }: ProgressBarProps) {

  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('ProgressBar must be inside NavigationProvider');
  }

  const activeSection = getActiveSection(sections, editor);

  return (
    <div className={`flex flex-col justify-items-center gap-3`}
    >
      {sections.map(({ id, level }) => (
        <Indicator highlight={activeSection ? activeSection.id === id : false} key={id} level={level} />
      ))}
    </div>
  );
}

