{/* eslint-disable @typescript-eslint/no-explicit-any*/ }
import {
  NodeViewWrapper,
  NodeViewContent,
  Editor,
} from "@tiptap/react";
import { GripHorizontal, GripVertical, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function TableComponent(props: { editor: Editor }) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const contentRef = useRef<HTMLElement | null>(null)
  const [columnX, setColumnX] = useState(0)
  const [rowY, setRowY] = useState(0)
  const [columnWidth, setColumnWidth] = useState(0)
  const [rowHeight, setRowHeight] = useState(0)

  const { editor } = props


  useEffect(() => {
    if (!contentRef.current) return

    setRect(
      contentRef.current.getBoundingClientRect()
    )
  }, [])

  useEffect(() => {

    const update = () => {

      const columnWidths = editor.storage.table.cols || []
      const rowHeights = editor.storage.table.rows || []

      setRowY(rowHeights
        .slice(0, editor.storage.table.currentRow?.index ?? 0)
        .reduce((sum, h) => sum + h, 0)
      )

      // Compute X offset
      setColumnX(columnWidths
        .slice(0, editor.storage.table.currentCol?.index ?? 0) // sum all columns to the left
        .reduce((sum, w) => sum + w, 0)
      )

      const width = editor.storage.table.currentCol?.width ?? 0
      setColumnWidth(width)

      const height = editor.storage.table.currentRow?.height ?? 0
      setRowHeight(height)
    }

    editor.on('transaction', update)

    return () => {
      editor.off('transaction', update)
    }

  }, [editor, columnX])

  return (
    <NodeViewWrapper
    >

      <div
        ref={(node) => {
          contentRef.current = node
        }}
        style={{
          position: 'relative'
        }}
      >
        <button
          style={{
            position: 'absolute',
            right: `${rect?.right}`,
            bottom: '0',
            // transform: `translate(${rect?.x}px, ${rect?.y}px)`,

            width: `${rect?.width}px`,
            background: 'green'
          }}
        >
          <Plus size={20} />
        </button>

        <button
          style={{
            position: 'absolute',
            top: '0',
            bottom: '0',
            right: '0',
            // transform: `translate(${rect?.x}px, ${rect?.y}px)`,

            height: `${rect?.height}px`,
            background: 'pink'
          }}
        >
          <Plus size={20} />
        </button>

        {/* column handle */}
        <button
          style={{
            position: 'absolute',
            left: `${columnX}px`,

            width: `${columnWidth}px`,
            top: 0,
            background: 'blue'
          }}
        >
          <GripHorizontal size={20} />
        </button>

        {/* row handle */}
        <button
          style={{
            position: 'absolute',
            left: `0`,
            top: `${rowY}px`,
            height: `${rowHeight}px`,
            background: 'orange'
          }}
        >
          <GripVertical size={20} />
        </button>

        <table

        >
          <NodeViewContent
            as={"tbody" as any}
          />
        </table>
      </div>

    </NodeViewWrapper>
  )
}