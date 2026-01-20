import { MoreHorizontal } from 'lucide-react';
import { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import Divider from './Divider';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Subscript,
  Superscript
} from 'lucide-react';
import { Dropdown } from '../dropdown';


export default function MoreOptions({ editor }: { editor: Editor }) {

  const [superscriptActive, setSuperscriptActive] = useState(false);
  const [subscriptActive, setSubscriptActive] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const superscript = editor.isActive('superscript');
      setSuperscriptActive(superscript);

      const subscript = editor.isActive('subscript');
      setSubscriptActive(subscript);
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
        <MoreHorizontal
          className='w-4 h-4'
        />
      </Dropdown.Trigger>

      <Dropdown.Content
        className='flex items-center -right-full py-1.5 px-2.5 gap-3 absolute -top-14
        z-10 rounded-full bg-white shadow shadow-neutral-200 text-neutral-600
      dark:bg-neutral-900 border dark:border-neutral-800 dark:text-neutral-200 dark:shadow-neutral-950
        '
      >
        <Dropdown.Group
          className='flex items-center gap-2'
        >
          {/*Superscript */}
          <Dropdown.Item
            onSelect={() => editor.chain().focus().toggleSuperscript().run()}
            active={superscriptActive}
          >
            <Superscript className='w-5 h-5' />
          </Dropdown.Item>

          {/*Subscript*/}
          <Dropdown.Item
            onSelect={() => editor.chain().focus().toggleSubscript().run()}
            active={subscriptActive}
          >
            <Subscript className='w-5 h-5' />
          </Dropdown.Item>
        </Dropdown.Group>

        <Divider />

        {/* Align */}
        <Dropdown.Group
          className='border border-neutral-300 dark:border-neutral-700
        rounded-lg z-40 flex my-auto pb-0.5 justify-center h-7 w-32'
        >
          {/* Align Left */}
          <Dropdown.Item
            onSelect={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
          >
            <AlignLeft className='w-4 h-4' />
          </Dropdown.Item>

          {/* Align Center */}
          <Dropdown.Item
            onSelect={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
          >
            <AlignCenter className='w-4 h-4' />
          </Dropdown.Item>

          {/* Align Right */}
          <Dropdown.Item
            onSelect={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
          >
            <AlignRight className='w-4 h-4' />
          </Dropdown.Item>

          {/* Align Justify */}
          <Dropdown.Item
            onSelect={() => editor.chain().focus().setTextAlign('justify').run()}
            active={editor.isActive({ textAlign: 'justify' })}
          >
            <AlignJustify className='w-4 h-4' />
          </Dropdown.Item>

        </Dropdown.Group>

      </Dropdown.Content>
    </Dropdown>
  )
}