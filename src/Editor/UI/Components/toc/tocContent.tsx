import { Editor } from "@tiptap/react";
import { focusHeadingById, getActiveHeading, getHeadings, scrollIntoView } from "./utils";
import { Navigation } from "./navigation";

import { useEffect, useState } from "react";
import { type HeadingType } from "./types";

import './tocContent.scss'

interface ContentProps {
  editor: Editor;
}

export function TocContent({ editor }: ContentProps) {
  const [activeHeading, setActiveHeading] = useState<HeadingType | null>(null);
  const [headings, setHeadings] = useState<HeadingType[] | null>(getHeadings(editor));

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      setHeadings(getHeadings(editor));

      const heading = getActiveHeading(editor);
      setActiveHeading(heading ?? null);
    };

    editor.on('update', update);
    editor.on('selectionUpdate', update);

    update();

    return () => {
      editor.off('update', update);
      editor.off('selectionUpdate', update);
    };
  }, [editor]);



  return (
    <Navigation.Content

    >
      <>
        {headings?.map((heading, index) => (
          <Navigation.Item
            key={index}
            onSelect={() => {
              focusHeadingById(editor, heading.id);
              scrollIntoView(heading.id);
            }}
            highlight={activeHeading?.id === heading.id}
            level={heading.level}


          // className={`cursor-pointer transition-all duration-200 
          //           hover:bg-neutral-100 hover:dark:bg-neutral-800
          //             rounded-lg flex justify-start items-center
          //               max-w-50 w-full
          //             whitespace-nowrap overflow-hidden text-ellipsis
          //           ${heading.id === activeHeading?.id ? 'text-cyan-600' : 'dark:text-neutral-400'}
          //           `}

          >
            {heading.title}

          </Navigation.Item>
        ))}
      </>

    </Navigation.Content>
  )
}