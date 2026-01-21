import { Editor } from "@tiptap/react";
import type { HeadingType } from "../types";
import { useEffect, useState } from "react";
import { getActiveHeading, getHeadings } from "../utils";
import { Navigation } from "../../navigation";
import { TocIndicator } from "./TocIndicator";

export interface ProgressBarProps {
  editor: Editor;
}

export function TocProgressBar({ editor }: ProgressBarProps) {
  const [activeHeading, setActiveHeading] = useState<HeadingType | null>(null);
  const [headings, setHeadings] = useState<HeadingType[] | null>(null);


  useEffect(() => {
    if (!editor) return;

    const updateHeadings = () => {
      setHeadings(getHeadings(editor));
    };

    const updateActiveHeading = () => {
      const heading = getActiveHeading(editor);
      setActiveHeading(heading ?? null);
    };

    editor.on('update', updateHeadings);
    editor.on('selectionUpdate', updateActiveHeading);

    // Initial sync
    updateHeadings();
    updateActiveHeading();

    return () => {
      editor.off('update', updateHeadings);
      editor.off('selectionUpdate', updateActiveHeading);
    };
  }, [editor]);

  return (

    <Navigation.Trigger
      className="flex flex-col justify-items-center gap-3 mt-0"
    >
      {headings?.map(({ id, level }) => (
        <TocIndicator
          key={id}
          highlight={activeHeading ? activeHeading.id === id : false}
          level={level}
        />
      ))}
    </Navigation.Trigger>
  );
}

