import Dropdown from "./Dropdown";
import DropdownItem from "./DropdownItem";
import { Editor } from "@tiptap/react";
import { type Level } from "@tiptap/extension-heading";
import { FaHeading } from "react-icons/fa";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

function HeadingLabel({ level }: { level: string }) {
  return (
    <div className='flex justify-items-center gap-1.5 border 
     rounded-lg pl-1.5 pr-1.5 pt-1 pb-1
     border-neutral-300 dark:border-neutral-700'>
      {level === 'Text' && (
        <FaHeading className="w-3 h-4 text-gray-600" />
      )}
      {level !== 'Text' && (
        <span className="text-gray-500 text-xs font-medium">{level}</span>
      )}

      <ChevronDown className="w-3 h-4 text-gray-600 mt-0.1" />
    </div>
  )
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
