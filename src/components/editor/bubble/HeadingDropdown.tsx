import Dropdown from "./Dropdown";
import DropdownItem from "./DropdownItem";
import { Editor } from "@tiptap/react";
import { type Level } from "@tiptap/extension-heading";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";


function HeadingLabel({ level }: { level: string }) {
  return (
    <div
      className="
        flex items-center gap-1.5
        border border-neutral-300 dark:border-neutral-700
        rounded-lg px-1.5 h-6
      "
    >
      {level === 'Text' ? (
        <span className="font-semibold text-[13px] text-neutral-600">H</span>
      ) : (
        <span
          className="
            text-[13px] leading-none font-medium
            text-neutral-600
          "
        >
          {level}
        </span>
      )}

      <ChevronDown
        className="
          w-3.5 h-3.5 text-neutral-600
          ml-0.5
        "
      />
    </div>
  );
}


export default function HeadingDropdown({ editor }: { editor: Editor }) {

  const [level, setLevel] = useState('Text');

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const current = editor.isActive('heading', { level: 1 }) ? 'H1' :
        editor.isActive('heading', { level: 2 }) ? 'H2' :
          editor.isActive('heading', { level: 3 }) ? 'H3' :
            'Text';
      setLevel(current);
    };

    editor.on('update', update);

    update();

    return () => {
      editor.off('update', update);
    }
  }, [editor]);

  return (
    <Dropdown label={<HeadingLabel level={level} />}>
      <DropdownItem
        active={editor.isActive('paragraph')}
        onSelect={() =>
          editor.chain().focus().setParagraph().run()
        }
      >
        Text
      </DropdownItem>

      {[1, 2, 3].map(level => (
        <DropdownItem
          key={level}
          active={editor.isActive('heading', { level })}
          onSelect={() =>
            editor.chain().focus().setHeading({ level: level as Level }).run()
          }
        >
          H{level}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}
