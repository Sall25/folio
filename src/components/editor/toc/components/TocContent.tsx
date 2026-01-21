import { Editor } from "@tiptap/react";
import { focusHeadingById, getActiveHeading, getHeadings, scrollIntoView } from "../utils";
import { Navigation } from "../../navigation";
import { useEffect, useState } from "react";
import { type HeadingType } from "../types";

interface ContentProps {
  editor: Editor;
}

export function TocContent({ editor }: ContentProps) {
  const [activeHeading, setActiveHeading] = useState<HeadingType | null>(null);
  const [headings, setHeadings] = useState<HeadingType[] | null>(null);

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
      className={`absolute -top-6 right-0 flex flex-col items-center gap-2
                  px-3 py-1 border dark:border-neutral-700 rounded-2xl
                   bg-neutral-50 dark:bg-neutral-900 shadow-xl
                   shadow-neutral-200
                dark:shadow-neutral-950
                  transition-all duration-400 ease-out`
      }
    >
      <>
        {headings?.map(heading => (
          <Navigation.Item
            key={heading.id}
            onSelect={() => {
              focusHeadingById(editor, heading.id);
              scrollIntoView(heading.id);
              console.log(heading.id)
            }}
            className={`cursor-pointer transition-all duration-200 
                      hover:bg-neutral-100 hover:dark:bg-neutral-800
                        rounded-lg flex justify-start items-center
                          max-w-50 w-full
                        whitespace-nowrap overflow-hidden text-ellipsis
                      ${heading.id === activeHeading?.id ? 'text-cyan-600' : ''}
                      `}

          >
            {heading.title}
          </Navigation.Item>
        ))}
      </>

    </Navigation.Content>
  )
}