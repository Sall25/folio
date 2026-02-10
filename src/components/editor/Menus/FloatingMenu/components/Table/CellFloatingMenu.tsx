import { Editor } from "@tiptap/react";
import { Content, Root, Trigger } from "@radix-ui/react-popover";
import { AlignCenter, Brush, ChevronRight, Circle, Grip, Merge, SquareX } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { autoUpdate, computePosition, type VirtualElement } from "@floating-ui/dom";
import { CellSelection } from "prosemirror-tables";
import type { ResolvedPos } from "@tiptap/pm/model";

function CellMenuContent({ editor, multipleSelection = false }: { editor: Editor, multipleSelection: boolean }) {

  return (
    <div className="dropdown-scroll">

      {/* MERGE Cells */}
      {multipleSelection && (
        <div
          className="dropdown-item"
          onClick={() => {
            editor.commands.mergeCells()
          }}
        >
          <Merge className="icon" size={20} />
          <span>Merge Cells</span>
        </div>
      )}

      {/* STYLE SUBMENUS */}
      <div
        className="dropdown-item-select"
        onClick={() => {
          editor.commands.setSelectedCellsStyle({ background: 'orange' })
        }}
      >
        <div className="dropdown-item">
          <Brush className="icon" size={20} />
          <span>Color</span>
        </div>
        <ChevronRight size={20} />
      </div>


      <hr className="dropdown-divider" />

      <div className="dropdown-item-select">
        <div className="dropdown-item">
          <AlignCenter className="icon" size={20} />
          <span>Alignment</span>
        </div>
        <ChevronRight size={20} />
      </div>

      {/* CLEAR */}
      <div
        className="dropdown-item"
        onClick={() => {
          editor.commands.clearSelectedCells()
        }}
      >
        <SquareX className="icon" size={20} />
        <span>Clear column contents</span>
      </div>

    </div>
  )
}

export function CellFloatingMenu({ editor }: { editor: Editor }) {
  const [hovered, setHovered] = useState(false)
  const posX = useRef(0)
  const posY = useRef(0)
  const floatingRef = useRef<HTMLDivElement | null>(null)
  const $anchorRef = useRef<ResolvedPos | null>(null)
  const $headRef = useRef<ResolvedPos | null>(null)
  const [multipleSelection, setMultipleSelection] = useState(false)
  const [visible, setVisible] = useState(false)
  const virtualElement = useRef<VirtualElement>({
    getBoundingClientRect: () => {
      return {
        x: posX.current,
        y: posY.current,
        left: posX.current,
        right: posX.current,
        top: posY.current,
        bottom: posY.current,
        width: 0,
        height: 0
      }
    }
  })

  const updatePosition = async () => {
    if (!floatingRef.current) return

    const { x, y } = await computePosition(virtualElement.current, floatingRef.current, {
      placement: 'right'
    })

    floatingRef.current.style.transform = `translate(${x}px, ${y}px) translateX(-50%)`
  }

  useEffect(() => {
    const handleSelectionUpdate = () => {
      const { state, view } = editor
      const selection = state.selection

      // CellSelection (multi-cell or single-cell)
      if (selection instanceof CellSelection) {
        const { $anchorCell, $headCell } = selection

        const isSingleCell =
          $anchorCell.pos === $headCell.pos

        setMultipleSelection(!isSingleCell)

        $anchorRef.current = $anchorCell
        $headRef.current = $headCell

        // Positions in the document
        const anchorPos = $anchorCell.before($anchorCell.depth + 1)
        const headPos = $headCell.before($headCell.depth + 1)

        // DOM nodes for those cells
        const anchorDom = view.nodeDOM(anchorPos) as HTMLElement | null
        const headDom = view.nodeDOM(headPos) as HTMLElement | null

        if (!anchorDom || !headDom) return

        // position UI near the head cell
        const rect = headDom.getBoundingClientRect()

        posX.current = rect.right
        posY.current = rect.top + rect.height / 2
        updatePosition()
        setVisible(true)

        return
      }

      // Normal cursor inside a single cell
      const { $from } = selection

      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d)
        if (node.type.name === "tableCell" || node.type.name === "tableHeader") {



          const pos = $from.before(d)

          // Normalize anchor & head to the CELL
          const $cell = state.doc.resolve(pos)

          $anchorRef.current = $cell
          $headRef.current = $cell

          const dom = view.nodeDOM(pos) as HTMLElement | null
          if (!dom) return

          const rect = dom.getBoundingClientRect()
          posX.current = rect.right
          posY.current = rect.top + rect.height / 2
          updatePosition()
          setVisible(true)
          return
        }
      }

      // CASE 3: Cursor left the table
      setVisible(false)
    }

    editor.on('selectionUpdate', handleSelectionUpdate)

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
    }
  }, [editor])


  useEffect(() => {
    if (!floatingRef.current) return
    const cleanup = autoUpdate(virtualElement.current, floatingRef.current, updatePosition)

    return () => cleanup()
  }, [])

  if (!visible) return null

  return createPortal(
    <Root
      onOpenChange={(open) => {
        if (open) {
          editor.view.dispatch(
            editor.view.state.tr.setSelection(new CellSelection($anchorRef.current!, $headRef.current!))
          )
        }
      }}
    >
      <Trigger asChild>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: `translate(-50%, -50%)`, // vertical center
            zIndex: 3,
            cursor: 'pointer'
          }}
          ref={(node) => {
            floatingRef.current = node
          }}

          onMouseEnter={(e) => {
            e.preventDefault()
            setHovered(true)
          }}
          onMouseLeave={(e) => {
            e.preventDefault()
            setHovered(false)
          }}
        >
          {hovered ? (

            <Grip size={16} style={{
              background: "#3b2f6d",
              borderRadius: '100%',
              padding: '2px'
            }} />
          ) : (
            <Circle size={12} fill="#3b2f6d" stroke="#3b2f6d" />
          )}
        </div>

      </Trigger>
      <Content
        className="dropdown-menu active"
      >
        <CellMenuContent
          editor={editor}
          multipleSelection={multipleSelection}
        />
      </Content>
    </Root>,
    document.body
  )
}
