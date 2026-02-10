import { Editor } from "@tiptap/react"
import {
  AlignCenter,
  Brush,
  ChevronRight,
  SortAsc,
  SquareArrowDown,
  SquareArrowUp,
  Trash,
  XSquare
} from "lucide-react"

export function RowDropdown({ editor, rowIndex }: { editor: Editor, rowIndex: number }) {

  const run = (fn: () => void) => () => {
    if (!editor.isActive("table")) return
    fn()
  }

  return (
    <div className="dropdown-scroll">
      <div className="dropdown-item"
        onClick={run(() => {
          editor.chain().focus().addRowBefore().run()
        })}
      >
        <SquareArrowUp
          className="icon"
          size={20} />
        <span>Insert row above</span>
      </div>
      <div className="dropdown-item"
        onClick={run(() => {
          editor.chain().focus().addRowAfter().run()
        })}
      >
        <SquareArrowDown
          className="icon"
          size={20} />
        <span>Insert row below</span>
      </div>

      <hr className="dropdown-divider" />

      <div className="dropdown-item"
        onClick={run(() => {
          editor.chain().focus().sortRow({ rowIndex, direction: 'asc' }).run()
        })}
      >
        <SortAsc
          className="icon"
          size={20} />
        <span>Sort Row A-Z</span>
      </div>
      <div className="dropdown-item"
        onClick={run(() => {
          editor.chain().focus().sortRow({ rowIndex, direction: 'desc' }).run()
        })}
      >
        <SortAsc
          className="icon"
          size={20} />
        <span>Sort Row Z-A</span>
      </div>

      <hr className="dropdown-divider" />

      <div className="dropdown-item-select">
        <div className="dropdown-item">
          <Brush
            className="icon"
            size={20} />
          <span>Color</span>
        </div>
        <ChevronRight size={20} />
      </div>
      <div className="dropdown-item-select">
        <div className="dropdown-item">
          <AlignCenter
            className="icon"
            size={20} />
          <span>Alignment</span>
        </div>
        <ChevronRight size={20} />
      </div>
      <div className="dropdown-item"
        onClick={run(() => {
          editor.chain().focus().clearRow().run()
        })}
      >
        <XSquare
          className="icon"
          size={20} />
        <span>Clear row contents</span>
      </div>

      <hr className="dropdown-divider" />

      <div className="dropdown-item"
        onClick={run(() => {
          editor.chain().focus().deleteRow().run()
        })}
      >
        <Trash
          className="icon"
          size={20} />
        <span>Delete row</span>
      </div>
    </div>
  )
}
