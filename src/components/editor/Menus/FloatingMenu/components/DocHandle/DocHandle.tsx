import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MenuItemsRenderer } from '../../../Shared'
import { getMenuItems, type MenuProps } from './utils/menuBuilder'
import type { Editor } from '@tiptap/core'
import { DragHandle } from '@tiptap/extension-drag-handle-react'
import { useState } from 'react'
import { Grip } from 'lucide-react'

type DocMenuContentProps = {
  editor: Editor,
  options: MenuProps['options']
}


export function DocMenuContent({ editor, options }: DocMenuContentProps) {
  const items = getMenuItems({ editor, options })

  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        className="dropdown-menu active"
        sideOffset={6}
        side='left'
      >
        <MenuItemsRenderer items={items} />
      </DropdownMenu.Content>
    </DropdownMenu.Portal>

  )
}

type Options = MenuProps['options']

type Label = 'Text' | 'Blockquote' | 'Ordered list' | 'Bullet list' | 'Heading 1' | 'Heading 2' | 'Heading 3'
const getLabel = (name: string, level: 1 | 2 | 3 | 4 = 1): Label => {
  switch (name) {
    case 'paragraph': return 'Text'
    case 'blockquote': return 'Blockquote'
    case 'orderedList': return 'Ordered list'
    case 'bulletList': return 'Bullet list'
    case 'heading': return `Heading ${level}` as Label
    default: return 'Text'
  }
}

export function DocHandle({ editor }: { editor: Editor }) {
  const [options, setOptions] = useState<Options | null>(null)


  return (
    <DragHandle
      editor={editor}
      computePositionConfig={
        {
          placement: 'left-start'
        }
      }
      onNodeChange={({ node, pos }) => {
        if (pos === -1 || node === null) {
          setOptions(null)
          return
        }
        if (node.type.name === 'image') {
          setOptions({
            target: 'ImageMenu',
            props: { pos }
          })
        }
        else if (node.type.name === 'codeBlock') {
          setOptions({
            target: 'CodeBlockMenu',
            props: { pos }
          })
        }
        else if (node.type.name === 'heading') {
          setOptions({
            target: 'HeadingMenu',
            props: { pos }
          })
        }
        else if (node.type.name === 'horizontalRule') {
          setOptions({
            target: 'Others',
            props: { pos, label: 'Horizontal rule' }
          })
        }
        else {
          setOptions({
            target: 'FormattingMenu',
            props: {
              pos,
              label: getLabel(node.type.name, node.attrs.level)
            },
          })
        }
      }}
    >
      <>
        {options && (
          <DropdownMenu.Root
            onOpenChange={(open) => {
              if (!open) {
                editor.commands.blur()
              }
            }}
          >
            <DropdownMenu.Trigger asChild>
              <button
                onPointerDownCapture={() => {
                  editor.commands.setNodeSelection(options.props.pos)
                }}
              >
                <Grip size={20} />
              </button>
            </DropdownMenu.Trigger>

            {options && (
              <DocMenuContent
                editor={editor}
                options={options}
              />
            )}

          </DropdownMenu.Root>
        )}
      </>

    </DragHandle>
  )
}