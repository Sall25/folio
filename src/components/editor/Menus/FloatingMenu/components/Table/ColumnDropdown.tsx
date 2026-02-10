import {
  SquareArrowLeft, SquareArrowRight,
  SortAsc, Brush, AlignCenter, ChevronRight,
  XSquare, Trash
} from "lucide-react"
import { Editor } from "@tiptap/react"

interface ColumnDropdownProps {
  editor: Editor;
  columnIndex: number;
}

export function ColumnDropdown({ editor, columnIndex }: ColumnDropdownProps) {

  const run = (fn: () => void) => () => {
    if (!editor.isActive("table")) return
    fn()
  }

  return (
    <div className="dropdown-scroll">

      {/* INSERT */}
      <div className="dropdown-item" onClick={run(() =>
        editor.chain().focus().addColumnBefore().run()
      )}>
        <SquareArrowLeft className="icon" size={20} />
        <span>Insert column left</span>
      </div>

      <div className="dropdown-item" onClick={run(() =>
        editor.chain().focus().addColumnAfter().run()
      )}>
        <SquareArrowRight className="icon" size={20} />
        <span>Insert column right</span>
      </div>

      <hr className="dropdown-divider" />

      {/* SORT (custom logic needed) */}
      <div className="dropdown-item" onClick={run(() =>
        editor.chain().focus().sortColumn({ columnIndex, direction: 'asc' }).run()
      )}>
        <SortAsc className="icon" size={20} />
        <span>Sort column A-Z</span>
      </div>

      <div className="dropdown-item" onClick={run(() =>
        editor.chain().focus().sortColumn({ columnIndex, direction: 'desc' }).run()
      )}>
        <SortAsc className="icon" size={20} />
        <span>Sort column Z-A</span>
      </div>

      <hr className="dropdown-divider" />

      {/* STYLE SUBMENUS (you'll open popovers here) */}
      <div className="dropdown-item-select">
        <div className="dropdown-item">
          <Brush className="icon" size={20} />
          <span>Color</span>
        </div>
        <ChevronRight size={20} />
      </div>

      <div className="dropdown-item-select">
        <div className="dropdown-item">
          <AlignCenter className="icon" size={20} />
          <span>Alignment</span>
        </div>
        <ChevronRight size={20} />
      </div>

      {/* CLEAR */}
      <div className="dropdown-item" onClick={run(() =>
        editor.chain().focus().clearColumn().run()
      )}>
        <XSquare className="icon" size={20} />
        <span>Clear column contents</span>
      </div>

      <hr className="dropdown-divider" />

      {/* DELETE */}
      <div className="dropdown-item danger" onClick={run(() =>
        editor.chain().focus().deleteColumn().run()
      )}>
        <Trash className="icon" size={20} />
        <span>Delete column</span>
      </div>
    </div>
  )
}
