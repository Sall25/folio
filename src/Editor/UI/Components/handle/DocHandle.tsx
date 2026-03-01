//import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
// import { MenuItemsRenderer } from '../../Menus/Shared'
import { MenuItemsRenderer } from '../menu-renderer'
import { getMenuItems, type MenuProps } from './utils/menuBuilder'
import type { Editor } from '@tiptap/core'
import { DragHandle } from '@tiptap/extension-drag-handle-react'
import { useEffect, useRef, useState } from 'react'
import { GripVertical, Plus } from 'lucide-react'
import { CardItemGroup } from '../card'
import { Button } from '../button'

import './docHandle.scss'
import { Popover, PopoverTrigger, PopoverContent } from '../popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '../dropdown-menu/dropdown-menu'
import { Root } from '@radix-ui/react-dropdown-menu'
import { useAnimationFrame } from '../hooks/use-animation-frame'


type DocMenuContentProps = {
  editor: Editor,
  options: MenuProps['options'],
  open?: boolean;
}


export function DocMenuContent({ editor, options }: DocMenuContentProps) {
  const items = getMenuItems({ editor, options })

  return (
    <DropdownMenuContent

      //className="doc-menu-content"
      sideOffset={6}
      side='left'
      style={{
        justifyContent: 'left',
        alignItems: 'flex-start',
        minWidth: '200px',
        gap: '8px',
        padding: '10px'
      }}
    >
      <MenuItemsRenderer items={items} />
    </DropdownMenuContent>

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
  const [open, setOpen] = useState(false)

  const visualRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const visual = visualRef.current
    if (!visual) return

    const root = visual.closest('[data-dragging]') as HTMLElement | null
    if (!root) return

    let currentY = root.offsetTop

    let targetY = 0

    let raf = 0

    const follow = () => {
      // where plugin ACTUALLY placed the handle

      targetY = root.offsetTop

      currentY += (targetY - currentY) * 0.18

      const dy = currentY - targetY

      visual.style.transform = `translateY(${-dy}px)`

      raf = requestAnimationFrame(follow)
    }

    raf = requestAnimationFrame(follow)

    return () => cancelAnimationFrame(raf)
  }, [options])

  return (
    <DragHandle

      editor={editor}
      computePositionConfig={
        {
          placement: 'left-start',

        }
      }
      onNodeChange={({ node, pos }) => {
        if (open) {
          console.log('open')
          return
        }
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
          <div
            ref={visualRef}
            className="doc-handle-visual"
            style={{
              position: 'relative',
              // display: 'flex',
              // alignItems: 'center',
              // transform: 'translateX(-10px)', // push fully outside

            }}
          >

            {/* actual UI */}
            <div
            // className="handle-container"
            >
              <CardItemGroup
                orientation='horizontal'
              >
                <Button
                  onClick={() => {
                    editor.chain().insertLineAfter(options.props.pos).run()
                  }}
                // className="plus-btn"
                >
                  <Plus
                    className='tiptap-button-icon'
                    size={16}
                  />
                </Button>

                {/* <DropdownMenu.Root
                  onOpenChange={(next) => {
                    setOpen(next)
                  }}
                >
                  <DropdownMenu.Trigger asChild>
                    <Button
                      //  className="drag-handle-btn"
                      onPointerDownCapture={() => {
                        if (open) {
                          editor.commands.clearSelection(options.props.pos)
                        } else {
                          editor.commands.setNodeSelection(options.props.pos)
                        }

                      }}
                    >
                      <GripVertical
                        className='tiptap-button-icon'
                        size={16} />
                    </Button>
                  </DropdownMenu.Trigger>

                  <DocMenuContent
                    editor={editor}
                    options={options}
                    open={open}
                  />


                </DropdownMenu.Root> */}


                <Root
                  open={open}
                  onOpenChange={setOpen}
                // onOpenChange={(next) => {
                //   setOpen(next)
                // }}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      //  className="drag-handle-btn"
                      onPointerDownCapture={() => {
                        if (open) {
                          editor.commands.clearSelection(options.props.pos)
                        } else {
                          editor.commands.setNodeSelection(options.props.pos)
                        }

                      }}
                    >
                      <GripVertical
                        className='tiptap-button-icon'
                        size={16} />
                    </Button>
                  </DropdownMenuTrigger>

                  <DocMenuContent
                    editor={editor}
                    options={options}
                    open={open}
                  />


                </Root>
              </CardItemGroup>
            </div>
          </div>
        )}


      </>

    </DragHandle>
  )
}