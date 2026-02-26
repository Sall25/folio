import { Editor } from "@tiptap/react";
import type { HeadingType } from "./types";
import { useEffect, useState } from "react";
import { getActiveHeading, getHeadings } from "./utils";
import { Navigation } from "./navigation";
import { TocIndicator } from "./tocIndicator";
import { CardItemGroup } from "../card";

import './tocProgressBar.scss'

export interface ProgressBarProps {
  editor: Editor;
}

export function TocProgressBar({ editor }: ProgressBarProps) {
  const [activeHeading, setActiveHeading] = useState<HeadingType | null>(null);
  const [headings, setHeadings] = useState<HeadingType[] | null>(getHeadings(editor));



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
      className="toc-progress-bar"
    >
      <CardItemGroup
        orientation="vertical"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}
      >
        {headings?.map(({ id, level }, index) => (
          <TocIndicator
            key={index}
            highlight={activeHeading ? activeHeading.id === id : false}
            level={level}

          />
        ))}
      </CardItemGroup>
    </Navigation.Trigger>
    // <CardItemGroup
    //   orientation="vertical"
    // >
    //   {headings?.map(({ id, level }, index) => (
    //     <TocIndicator
    //       key={index}
    //       highlight={activeHeading ? activeHeading.id === id : false}
    //       level={level}
    //     />
    //   ))}
    // </CardItemGroup>
  );
}

