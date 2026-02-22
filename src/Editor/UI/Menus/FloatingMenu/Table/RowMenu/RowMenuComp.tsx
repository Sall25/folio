import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { Editor } from '@tiptap/core'
import { useState } from 'react'
import { Grip } from 'lucide-react'
import { getMenuItems } from '../utils/menuBuilder'
import { MenuItemsRenderer } from '../../../Shared'
import { RowDragHandleComponent } from '../RowDragHandle/RowDragHandle'


export function RowMenuContent({ editor, rowIndex, tablePos }: { editor: Editor, rowIndex: number, tablePos: number }) {

  const items = getMenuItems({ editor, options: { target: 'row', props: { rowIndex, tablePos } } });

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

export function RowMenuComp({ editor }: { editor: Editor }) {
  const [rowIndex, setRowIndex] = useState(-1)
  const [tablePos, setTablePos] = useState(-1)
  const [rect, setRect] = useState(new DOMRect())

  return (
    <RowDragHandleComponent
      editor={editor}
      onRowNodeChange={({ tablePos, rowIndex, rect }) => {
        setRowIndex(rowIndex)
        setTablePos(tablePos)
        if (rect) {
          setRect(rect)
        }
      }}
      computePositionConfig={{
        placement: 'left-end'
      }}
    >
      <>
        {rowIndex !== -1 && tablePos !== -1 && (
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

                  editor.commands.selectRow(rowIndex, tablePos)
                }}
                style={{
                  height: `${rect.height}px`
                }}
              >
                <Grip size={20}
                />
              </button>
            </DropdownMenu.Trigger>

            <RowMenuContent
              editor={editor}
              rowIndex={rowIndex}
              tablePos={tablePos}
            />
          </DropdownMenu.Root>
        )}
      </>
    </RowDragHandleComponent>
  )
}
