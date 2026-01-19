import { Editor } from '@tiptap/react';
import Dropdown from './Dropdown';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Type } from 'lucide-react';

function ColorLabel({ value }: { value?: string }) {
  return (
    <div
      className="
        flex items-center gap-1.5
        border border-neutral-300 dark:border-neutral-700
        rounded-lg px-1.5 h-6
      "
    >
      {/* Default icon */}
      {!value && <Type className="w-3.5 h-3.5 text-neutral-600" />}

      {/* Color value */}
      {value && (
        <span className="text-[13px] font-medium text-neutral-600 leading-none">
          {value}
        </span>
      )}

      {/* Dropdown chevron */}
      <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />
    </div>
  );
}



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

interface PaletteProps {
  editor: Editor;
  palette: 'Color' | 'Background';
}


function Palette({ editor, palette }: PaletteProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Palette title */}
      <span className="text-neutral-600 font-medium text-sm">{palette}</span>

      {/* Color grid */}
      <div
        className="
          grid grid-cols-5 gap-2.5
          p-2 border border-neutral-200 rounded-lg
          bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-900
        "
      >
        {COLORS.map((c) => {
          const isWhite = c.value === '#ffffff';

          if (palette === 'Background') {
            return (
              <span
                key={c.value}
                className={`
                  w-6 h-6 rounded-full
                  ring-1 ${isWhite ? 'ring-neutral-300 dark:ring-neutral-700' : 'ring-neutral-200 dark:ring-neutral-900'}
                  border border-neutral-500 dark:border-neutral-900
                  transition-transform duration-200
                  hover:scale-105 cursor-pointer
                `}
                style={{ backgroundColor: c.value ?? 'black' }}
                onMouseDown={() => {
                  editor
                    .chain()
                    .focus()
                    .toggleTextStyle({ backgroundColor: c.value })
                    .run();
                }}
              />
            );
          }

          if (palette === 'Color') {
            return (
              <span
                key={c.value}
                className={`
                  w-6 h-6 rounded-full
                  border border-neutral-500 dark:border-neutral-900
                  transition-transform duration-200
                  hover:scale-105 cursor-pointer
                  flex items-center justify-center
                  ${isWhite ? 'ring-1 ring-neutral-300 dark:ring-neutral-700' : ''}
                `}
                style={{
                  color: isWhite ? 'lightgray' : c.value ?? 'black',
                  border: `1px solid ${c.value ?? 'black'}`,
                }}
                onMouseDown={() => {
                  editor
                    .chain()
                    .focus()
                    .toggleTextStyle({ color: c.value })
                    .run();
                }}
              >
                <Type className="w-3.5 h-3.5" />
              </span>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}


export default function ColorDropdown({ editor }: { editor: Editor }) {
  const [color, setColor] = useState<{ name: string, value?: string }>({ name: 'Default' })

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const currentColor = editor.getAttributes('textStyle').color ?? 'transparent';
      setColor(currentColor);
    };

    editor.on('update', update);

    update();

    return () => {
      editor.off('update', update);
    }
  }, [editor]);

  return (
    <Dropdown label={<ColorLabel value={color.value} />}>
      <div className="flex flex-col gap-4 p-1.5 w-44">
        <Palette editor={editor} palette='Color' />
        <hr className="text-neutral-200" />
        <Palette editor={editor} palette='Background' />
      </div>
    </Dropdown>
  );
}
