import { useEffect, useState } from "react";
import Dropdown from "./Dropdown";
import DropdownItem from "./DropdownItem";
import { Editor } from "@tiptap/react";
import { TbTextSize } from 'react-icons/tb';
import { ChevronDown } from "lucide-react";

function FontSizeLabel({ label, value }: { label: string, value: string }) {
  return (
    <div className='flex justify-items-center gap-1.5 border
     rounded-lg pl-1.5 pr-1.5 pt-1 pb-1
     border-neutral-300 dark:border-neutral-700'>
      {label === 'Normal' && (
        <TbTextSize className="w-4 h-4 text-gray-600" />
      )}
      {label !== 'Normal' && (
        <span className="text-gray-500 text-xs font-medium">{value}</span>
      )}

      <ChevronDown className="w-3 h-4 text-gray-600 mt-0.1" />
    </div>
  )
}


export default function FontSizeDropdown({ editor }: { editor: Editor }) {
  const [size, setSize] = useState('16px');

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const currentSize = editor.getAttributes('textStyle').fontSize || '16px';
      setSize(currentSize);
    };

    editor.on('update', update);

    update();

    return () => {
      editor.off('update', update);
    }

  }, [editor])

  const sizes = [
    { label: 'Small', value: '14px' },
    { label: 'Normal', value: '16px' },
    { label: 'Large', value: '18px' },
    { label: 'XL', value: '22px' },
  ];

  return (
    <Dropdown label={<FontSizeLabel value={size} label={sizes.find(s => s.value === size)?.label || 'Normal'} />}>
      {sizes.map(s => (
        <DropdownItem
          key={s.value}
          active={size === s.value}
          onSelect={() => {
            editor.chain().focus().toggleTextStyle({ fontSize: s.value }).run()
            setSize(s.value)
          }}
        >

          {s.value}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}
