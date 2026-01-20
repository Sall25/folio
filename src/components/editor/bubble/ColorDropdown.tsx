const COLORS = [
  { name: 'Default', value: null },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'White', value: '#ffffff' },
];

import { Editor } from "@tiptap/react";
import { Dropdown } from "../dropdown";
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function ColorDropdown({ editor }: { editor: Editor }) {
  const [color, setColor] = useState<{ name: string, value?: string }>({ name: 'Default', value: '#000000' })

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const currentColor = editor.getAttributes('textStyle').color ?? '#000000';
      setColor({ name: currentColor, value: currentColor });
    };

    editor.on('update', update);

    update();

    return () => {
      editor.off('update', update);
    }
  }, [editor]);

  return (
    <Dropdown>
      <Dropdown.Trigger>
        <div
          className="
            flex items-center gap-1 justify-center 
            hover:text-neutral-500 hover:bg-neutral-100
             rounded-lg dark:hover:bg-neutral-800
            text-neutral-600 
            dark:text-neutral-200 dark:border-neutral-600"
        >
          {/* Default icon */}
          <span className={`rounded-full h-6 w-6
            flex justify-center items-center font-light border dark:border-neutral-400
            `}
            style={{ color: `${color.value === '#000000' ? '#ffffff' : color.value}` }}
          >
            A
          </span>
          {/* Dropdown chevron */}
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </Dropdown.Trigger>

      <Dropdown.Content>

        {/* Color */}
        <Dropdown.Group
          label="Color"
          className={`grid grid-cols-5 gap-3
           p-2 border border-neutral-200 rounded-lg
           bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-800`}
        >
          {COLORS.map(c => (
            <span
              key={c.value}
              className={`
                  w-6 h-6 rounded-full flex justify-center items-center
                   border border-neutral-500 dark:border-neutral-900
                  transition-transform duration-200
                  hover:scale-105 cursor-pointer
                  ${c.value === '#ffffff' ? 'ring-1 ring-neutral-300 dark:ring-neutral-700' : ''}
                `}
              style={{
                color: c.value === '#ffffff' ? 'lightgray' : c.value ?? 'black',
                border: `1px solid ${c.value}`
              }}
              onMouseDown={() => {
                editor
                  .chain()
                  .focus()
                  .toggleTextStyle({ color: c.value })
                  .run();
              }}
            >
              A
            </span>
          ))}
        </Dropdown.Group>

        {/* Background Color */}
        <Dropdown.Group
          label="Background"
          className={`grid grid-cols-5 gap-3
           p-2 border border-neutral-200 rounded-lg
           bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-800`}
        >
          {COLORS.map(c => (
            <span
              key={c.value}
              className={`
                  w-6 h-6 rounded-full
                   border border-neutral-500 dark:border-neutral-900
                  transition-transform duration-200
                  hover:scale-105 cursor-pointer
                `}
              style={{ backgroundColor: c.value ?? 'black', }}
              onMouseDown={() => {
                editor
                  .chain()
                  .focus()
                  .toggleTextStyle({ backgroundColor: c.value })
                  .run();
              }}
            />
          ))}
        </Dropdown.Group>

      </Dropdown.Content>
    </Dropdown>
  );
}