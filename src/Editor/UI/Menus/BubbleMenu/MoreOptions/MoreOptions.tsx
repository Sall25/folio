import { MoreVertical } from 'lucide-react';
import { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Subscript,
  Superscript
} from 'lucide-react';
import { Root, Trigger, Content } from '@radix-ui/react-popover';
import BubbleButton from '../BubbleButton/BubbleButton';
import { Divider } from '../Divider';


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
    <Root
      onOpenChange={(open) => {
        if (!open) {
          editor.view.focus()
        }
      }}
    >
      <Trigger className='bubble-button'>
        <BubbleButton>
          <MoreVertical
            className='icon'
          />
        </BubbleButton>
      </Trigger>

      <Content
        side="top"
        align="end"
        sideOffset={12}
        alignOffset={-8}
        className="m-0 p-0 outline-0 bubble-menu active"

      >
        {/*Superscript */}
        <BubbleButton
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          active={superscriptActive}
        >
          <Superscript />
        </BubbleButton>

        {/*Subscript*/}
        <BubbleButton
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          active={subscriptActive}
        >
          <Subscript />
        </BubbleButton>

        {/* Divider */}
        <Divider />

        {/* Align Left */}
        <BubbleButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={align === 'left'}
        >
          <AlignLeft className='w-4 h-4' />
        </BubbleButton>

        {/* Align Center */}
        <BubbleButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={align === 'center'}
        >
          <AlignCenter className='w-4 h-4' />
        </BubbleButton>

        {/* Align Right */}
        <BubbleButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={align === 'right'}
        >
          <AlignRight className='w-4 h-4' />
        </BubbleButton>

        {/* Align Justify */}
        <BubbleButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          active={align === 'justify'}
        >
          <AlignJustify className='w-4 h-4' />
        </BubbleButton>

      </Content>
    </Root>
  )
}