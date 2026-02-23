import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { Editor } from '@tiptap/core'
import { useState } from 'react'
import { Grip } from 'lucide-react'
import { getMenuItems } from '../utils/menuBuilder'
import { MenuItemsRenderer } from '../../../Shared'
import { CellHandle } from '../CellHandle/CellHandle'

export function CellMenuContent({ editor, cellPos, multiple = false }: { editor: Editor, cellPos: number, multiple: boolean }) {

  let items = []
  if (multiple) {
    items = getMenuItems({ editor, options: { target: 'cells', props: { pos: cellPos } } });
  } else {
    items = getMenuItems({ editor, options: { target: 'cell', props: { pos: cellPos } } });
  }

  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        className="dropdown-menu active"
        sideOffset={6}
        side='bottom'
      >
        <MenuItemsRenderer
          items={items} />
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

export function CellMenu({ editor }: { editor: Editor }) {
  const [cellPos, setCellPos] = useState(-1)

  return (
    <CellHandle
      editor={editor}
      onCellNodeChange={({ cellPos }) => {
        setCellPos(cellPos)
      }}
      computePositionConfig={{
        placement: 'right',
        // middleware: [
        //   offset(({ rects }) => {
        //     return -rects.floating.width / 2
        //   })
        // ]
      }}
    >
      <>
        {cellPos !== -1 && (
          <DropdownMenu.Root
            onOpenChange={(open) => {
              if (!open) {
                editor.commands.blur()
              }
            }}
          >
            <DropdownMenu.Trigger asChild>
              <button
                style={{
                  position: 'relative',
                  transform: 'translateX(-50%)'
                }}
                onPointerDownCapture={() => {
                  editor.commands.selectCell(cellPos)
                }}
              >
                <Grip size={10}
                />
              </button>
            </DropdownMenu.Trigger>

            <CellMenuContent
              editor={editor}
              cellPos={cellPos}
              multiple={false}
            />
          </DropdownMenu.Root>
        )}
      </>
    </CellHandle>
  )
}
