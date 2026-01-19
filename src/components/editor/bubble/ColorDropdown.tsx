import { Editor } from '@tiptap/react';
import Dropdown from './Dropdown';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Type } from 'lucide-react';
import { FaFont } from 'react-icons/fa';

function ColorLabel({ value }: { value?: string }) {
  return (
    <div className='border border-neutral-300 dark:border-neutral-700
      rounded-lg z-40 flex my-auto justify-center h-7 w-10 px-1'>
      {!value && (
        <Type className=" text-gray-600" />
      )}
      {value && (
        <span className="text-gray-500 text-xs font-medium">{value}</span>
      )}

      <ChevronDown className=" text-gray-600 mt-0.1" />
    </div>
  )
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
    <div className='flex flex-col align-center justify-center gap-1 '>
      <span className='text-neutral-600 font-medium text-sm'>
        {palette}
      </span>
      <div className='grid grid-cols-5 gap-4 pl-2.5 pr-2.5 pt-1 pb-1 border border-neutral-200 rounded-lg
      bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-900'
      >
        {COLORS.map(c => (
          <>
            {palette === 'Background' && (
              <span key={c.value}
                className={`w-5 h-5 ring-1 ring-neutral-200 rounded-full border-neutral-500 
                  dark:border-neutral-900 dark:ring-neutral-900 shadow-xs
                  transition-all duration-200 
            hover:scale-105`}
                style={{ backgroundColor: c.value ?? 'black' }}
                onMouseDown={() => {
                  // if (palette === 'Color') {
                  //   editor.chain().focus().toggleTextStyle({ color: c.value }).run();
                  // } else {

                  // }
                  editor.chain().focus().toggleTextStyle({ backgroundColor: c.value }).run();
                }}
              >
              </span>
            )}
            {palette === 'Color' && (
              <span key={c.value}
                className={`w-5 h-5 ${c.value === '#ffffff' ? 'ring-1 ring-neutral-300' : ''} 
                rounded-full border-neutral-500 
                  dark:border-neutral-900 dark:ring-neutral-900 shadow-xs
                  transition-all duration-200 flex justify-center
                  hover:scale-105`}
                style={{
                  color: c.value ? c.value === '#ffffff' ? 'lightgray' : c.value : 'black',
                  border: `1px solid ${c.value ?? 'black'}`
                }}
                onMouseDown={() => {
                  editor.chain().focus().toggleTextStyle({ color: c.value }).run();
                }}
              >
                <FaFont className='mx-auto my-auto w-4 h-4' />
              </span>
            )}
          </>
        ))}
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
