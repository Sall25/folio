import { MoreVertical, SeparatorVertical } from 'lucide-react';
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
import { Root, Trigger, Content } from '@radix-ui/react-popover';
import ToolbarButton from './ToolbarButton';


export default function MoreOptions({ editor }: { editor: Editor }) {

  const [superscriptActive, setSuperscriptActive] = useState(false);
  const [subscriptActive, setSubscriptActive] = useState(false);

  const [align, setAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');


  useEffect(() => {
    if (!editor) return;

    function getActiveTextAlign(editor: Editor): 'left' | 'center' | 'right' | 'justify' {
      const types = ['paragraph', 'heading', 'listItem'];

      for (const type of types) {
        if (editor.isActive(type)) {
          return editor.getAttributes(type).textAlign ?? 'left';
        }
      }

      return 'left';
    }


    const update = () => {
      const superscript = editor.isActive('superscript');
      setSuperscriptActive(superscript);

      const subscript = editor.isActive('subscript');
      setSubscriptActive(subscript);

      const currentAlign = getActiveTextAlign(editor);
      setAlign(currentAlign);
    };

    editor.on('update', update);

    update();

    return () => {
      editor.off('update', update);
    }
  }, [editor]);

  return (
    <Root>
      <Trigger>
        <ToolbarButton>
          <MoreVertical
            className='w-4 h-4'
          />
        </ToolbarButton>
      </Trigger>

      <Content
        side="top"
        align="end"
        sideOffset={12}
        className=''

      >
        <div
          className='flex items-center py-1.5 px-2.5 gap-3 
        rounded-2xl bg-white shadow-sm shadow-neutral-200 text-neutral-600
      dark:bg-neutral-900 ring-1 dark:ring-neutral-800
       dark:text-neutral-200 dark:shadow-neutral-950
        '
        >
          <div className='flex items-center'>

            {/*Superscript */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              active={superscriptActive}

            >
              <Superscript />
            </ToolbarButton>

            {/*Subscript*/}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              active={subscriptActive}
            >
              <Subscript />
            </ToolbarButton>
          </div>

          <Divider />


          {/* Align */}
          <div
            className=' flex my-auto pb-0.5 justify-center '
          >
            {/* Align Left */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              active={align === 'left'}
            >
              <AlignLeft className='w-4 h-4' />
            </ToolbarButton>

            {/* Align Center */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              active={align === 'center'}
            >
              <AlignCenter className='w-4 h-4' />
            </ToolbarButton>

            {/* Align Right */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              active={align === 'right'}
            >
              <AlignRight className='w-4 h-4' />
            </ToolbarButton>

            {/* Align Justify */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              active={align === 'justify'}
            >
              <AlignJustify className='w-4 h-4' />
            </ToolbarButton>


          </div>
        </div>
      </Content>
    </Root>


  )
}