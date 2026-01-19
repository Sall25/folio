import { useEffect, useState } from "react";
import Dropdown from "./Dropdown";
import DropdownItem from "./DropdownItem";
import { Editor } from "@tiptap/react";
import { FaFont } from "react-icons/fa";
import { ChevronDown } from 'lucide-react';

function FontFamilyLabel({ font }: { font: string }) {
  return (
    <div className='flex justify-items-center gap-1.5 border border-neutral-300 dark:border-neutral-700
     rounded-lg pl-1.5 pr-1.5 pt-1 pb-1'>
      {font === 'Default' && (
        <FaFont className="w-3 h-4 text-gray-600" />
      )}
      {font !== 'Default' && (
        <span className="text-gray-600 text-xs font-medium">{font}</span>
      )}

      <ChevronDown className="w-4 h-4 text-gray-500 mt-0.1 
      dark:hover:bg-neutral-700 rounded transition-all duration-200 scale-105" />
    </div>
  )
}

export default function FontFamilyDropdown({ editor }: { editor: Editor }) {
  const [font, setFont] = useState('Default');

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const currentFont = editor.getAttributes('textStyle').fontFamily || 'Default';
      setFont(currentFont);
    }

    editor.on('update', update);

    update();

    return () => {
      editor.off('update', update);
    }
  }, [editor]);

  return (
    <Dropdown label={<FontFamilyLabel font={font} />}>
      <DropdownItem
        active={!editor.getAttributes('textStyle').fontFamily}
        onSelect={() => {
          editor.chain().focus().unsetFontFamily().run()
          setFont('Default')
        }}
      >
        Default
      </DropdownItem>

      {['Inter', 'serif', 'monospace',
        'calibri', 'cambria', 'calisto mt',
        'broadway'
      ].map(f => (
        <DropdownItem
          key={f}
          active={font === f}
          onSelect={() => {
            editor.chain().focus().setFontFamily(f).run()
            setFont(f);
          }}
          style={{ fontFamily: f }}
        >
          {f}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}
