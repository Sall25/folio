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
    editor.on('transaction', update)

    update();

    return () => {
      editor.off('update', update);
      editor.off('selectionUpdate', update);
      editor.off('transaction', update)
    };
  }, [editor]);



  return (
    <Navigation.Content
      className="toc-content"
    >
      <>
        {headings?.map((heading, index) => (
          <Navigation.Item
            key={index}
            onSelect={() => {

              focusHeadingById(editor, heading.id)
              scrollIntoView(heading.id)

            }}
            highlight={activeHeading?.id === heading.id}
            level={heading.level}
          >
            {heading.title}

          </Navigation.Item>
        ))}
      </>

    </Navigation.Content>
  )
}