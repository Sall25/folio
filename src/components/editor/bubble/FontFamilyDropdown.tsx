import { useEffect, useState } from "react";
import Dropdown from "./Dropdown";
import DropdownItem from "./DropdownItem";
import { Editor } from "@tiptap/react";
import { ChevronDown } from 'lucide-react';


function FontFamilyLabel({ font }: { font: string }) {
  return (
    <div
      className="
        flex items-center gap-1.5
        border border-neutral-300 dark:border-neutral-700
        rounded-lg px-1.5 h-6
      "
    >
      {font === 'Default' ? (
        <span className="font-semibold text-[13px] text-neutral-600">A</span>

      ) : (
        <span
          className="
            text-[13px] leading-none font-medium
            text-neutral-600
            truncate
          "
        >
          {font}
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
