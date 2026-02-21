import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { Editor } from '@tiptap/core'
import { useState } from 'react'
import { Grip } from 'lucide-react'
import { getMenuItems } from '../utils/menuBuilder'
import { MenuItemsRenderer } from '../../../../Shared'
import { ColumnDragHandleComponent } from '../ColumnDragHandle'

export function ColumnMenuContent({ editor, columnIndex, tablePos }: { editor: Editor, columnIndex: number, tablePos: number }) {

  const items = getMenuItems({ editor, options: { target: 'column', props: { columnIndex, tablePos } } });

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

export function ColumnMenu({ editor }: { editor: Editor }) {
  const [columnIndex, setColumnIndex] = useState(-1)
  const [tablePos, setTablePos] = useState(-1)
  const [rect, setRect] = useState(new DOMRect())

  return (
    <ColumnDragHandleComponent
      editor={editor}
      onColumnNodeChange={({ tablePos, columnIndex, rect }) => {
        setColumnIndex(columnIndex)
        setTablePos(tablePos)
        if (rect) {
          setRect(rect)
        }
      }}
      computePositionConfig={{
        placement: 'top-end'
      }}
    >
      <>
        {columnIndex !== -1 && tablePos !== -1 && (
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
                  editor.commands.selectColumn(columnIndex, tablePos)
                }}
                style={{
                  width: `${rect.width}px`
                }}
              >
                <Grip size={20}
                />
              </button>
            </DropdownMenu.Trigger>

            <ColumnMenuContent
              editor={editor}
              columnIndex={columnIndex}
              tablePos={tablePos}
            />
          </DropdownMenu.Root>
        )}
      </>
    </ColumnDragHandleComponent>
  )
}
