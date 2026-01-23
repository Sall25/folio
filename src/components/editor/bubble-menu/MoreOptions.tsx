import { MoreVertical } from 'lucide-react';
import { Editor, useEditorState } from '@tiptap/react';
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
import Button from './Button';
import Tooltip from './Tooltip';

const groupClass =
  "flex items-center"


export default function MoreOptions({ editor }: { editor: Editor }) {
  const {
    isSuperscript,
    isSubscript,
    canSuperscript,
    canSubscript,
    align,
  } = useEditorState({
    editor,
    selector: ({ editor }) => {
      const getAlign = (): 'left' | 'center' | 'right' | 'justify' => {
        const types = ['paragraph', 'heading', 'listItem']

        for (const type of types) {
          if (editor.isActive(type)) {
            return editor.getAttributes(type).textAlign ?? 'left'
          }
        }
        return 'left'
      }

      return {
        isSuperscript: editor.isActive('superscript'),
        isSubscript: editor.isActive('subscript'),

        canSuperscript: editor.can().toggleSuperscript(),
        canSubscript: editor.can().toggleSubscript(),

        align: getAlign(),
      }
    },
  })

  if (!editor) return null

  return (
    <Root>
      <Trigger asChild>
        <span
          className='text-neutral-600 dark:text-neutral-300 py-1.5 px-2 rounded-lg hover:bg-neutral-200/70 dark:hover:bg-neutral-700/70'

        >
          <MoreVertical className="w-4 h-4" />
        </span>
      </Trigger>

      <Content
        side="top"
        align="center"
        sideOffset={16}
        className="
        popover-animate
        flex items-center gap-3 py-1.5 px-2.5 rounded-2xl
      text-neutral-600 dark:bg-neutral-900 ring-1
             ring-neutral-800
            
        "
      >
        {/* Sup/Sub */}
        <div className={groupClass}>
          <Tooltip label='Superscript'>
            <Button
              active={isSuperscript}
              disabled={!canSuperscript}
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
            >
              <Superscript className="w-4 h-5" />
            </Button>
          </Tooltip>

          <Tooltip label='Subscript'>
            <Button
              active={isSubscript}
              disabled={!canSubscript}
              onClick={() => editor.chain().focus().toggleSubscript().run()}
            >
              <Subscript className="w-4 h-5" />
            </Button>
          </Tooltip>
        </div>

        <Divider />

        {/* Align */}
        <div className={groupClass}>
          <Tooltip label='Align Left'>
            <Button
              active={align === 'left'}
              onClick={() => editor.chain().focus().setTextAlign('left').run()}

            >
              <AlignLeft className="w-4 h-3" />
            </Button>
          </Tooltip>

          <Tooltip label='Align Center'>
            <Button
              active={align === 'center'}
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
            >
              <AlignCenter className="w-4 h-3" />
            </Button>
          </Tooltip>

          <Tooltip label='Align Right'>
            <Button
              active={align === 'right'}
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
            >
              <AlignRight className="w-4 h-3" />
            </Button>
          </Tooltip>

          <Tooltip label='Align Justify'>
            <Button
              active={align === 'justify'}
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            >
              <AlignJustify className="w-4 h-3" />
            </Button>
          </Tooltip>
        </div>
      </Content>
    </Root>
  );
}