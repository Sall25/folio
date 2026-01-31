import { Editor } from "@tiptap/react"
import { AlignCenter, ArrowLeft, ArrowRight, Brush, ChevronRight, Copy, Delete, MoveLeft, MoveRight, SortAsc, SquareArrowLeft, SquareArrowRight, Trash, XSquare } from "lucide-react"

export function ColumnDropdown({ editor }: { editor: Editor }) {

  return (
    <div className="dropdown-menu active">
      <div className="dropdown-item">
        <MoveLeft
          className="icon"
          size={20} />
        <span>Move column left</span>
      </div>
      <div className="dropdown-item">
        <MoveRight
          className="icon"
          size={20} />
        <span>Move column right</span>
      </div>

      <hr className="dropdown-divider" />

      <div className="dropdown-item">
        <SquareArrowLeft
          className="icon"
          size={20} />
        <span>Insert column left</span>
      </div>
      <div className="dropdown-item">
        <SquareArrowRight
          className="icon"
          size={20} />
        <span>Insert column right</span>
      </div>

      <hr className="dropdown-divider" />

      <div className="dropdown-item">
        <SortAsc
          className="icon"
          size={20} />
        <span>Sort column A-Z</span>
      </div>
      <div className="dropdown-item">
        <SortAsc
          className="icon"
          size={20} />
        <span>Sort column Z-A</span>
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
      <div className="dropdown-item">
        <XSquare
          className="icon"
          size={20} />
        <span>Clear column contents</span>
      </div>

      <hr className="dropdown-divider" />

      <div className="dropdown-item">
        <Copy
          className="icon"
          size={20} />
        <span>Duplicate column</span>
      </div>
      <div className="dropdown-item">
        <Trash
          className="icon"
          size={20} />
        <span>Delete column</span>
      </div>
    </div>
  )
}
