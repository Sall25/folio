{/* eslint-disable @typescript-eslint/no-explicit-any*/ }
import {
  NodeViewWrapper,
  NodeViewContent,
  Editor,
} from "@tiptap/react";
import { GripHorizontal, GripVertical, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";


export function TableComponent(props: { editor: Editor }) {
  const contentRef = useRef<HTMLElement | null>(null)
  const [columnX, setColumnX] = useState(0)
  const [rowY, setRowY] = useState(0)
  const [columnWidth, setColumnWidth] = useState(0)
  const [rowHeight, setRowHeight] = useState(0)
  const [overLastCol, setOverLastCol] = useState(false)
  const [overLastRow, setOverLastRow] = useState(false)
  const [tableWidth, setTableWidth] = useState(0)
  const [tableHeight, setTableHeight] = useState(0)
  const wrapperRef = useRef<HTMLElement | null>(null)
  const controlsRef = useRef<HTMLElement | null>(null)
  const [overWrapper, setOverWrapper] = useState(false)

  //const [overTable, setOverTable] = useState(false)

  const { editor } = props

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

      setTableWidth(
        columnWidths.reduce((sum, w) => sum + w, 0)
      )

      setTableHeight(
        rowHeights.reduce((sum, h) => sum + h, 0)
      )

      const width = editor.storage.table.currentCol?.width ?? 0
      setColumnWidth(width)

      const height = editor.storage.table.currentRow?.height ?? 0
      setRowHeight(height)

      setOverLastCol(
        editor.storage.table.overLastColumn
      )

      setOverLastRow(
        editor.storage.table.overLastRow
      )
    }

    editor.on('transaction', update)

    const handleMouseEnter = () => {
      setOverWrapper(true)
    }

    const handleMouseLeave = (e: MouseEvent) => {
      if (contentRef.current && contentRef.current.contains(e.relatedTarget as Node)) {
        return
      }
      setOverWrapper(false)
    }

    contentRef.current?.addEventListener('mouseenter', handleMouseEnter)
    contentRef.current?.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      editor.off('transaction', update)
      contentRef.current?.removeEventListener('mouseenter', handleMouseEnter)
      contentRef.current?.removeEventListener('mouseleave', handleMouseLeave)
    }

  }, [editor, columnX])

  return (
    <NodeViewWrapper
      style={{ overflow: 'visible', display: 'flex', alignItems: 'center' }}
      ref={(node: HTMLElement | null) => {
        wrapperRef.current = node
      }}
    >

      <div
        ref={(node) => {
          contentRef.current = node
        }}
        // style={{
        //   position: 'relative',
        //   overflow: 'visible',
        //   width: '100%',
        //   margin: `-${correction}px`,
        //   background: 'lightpink',
        //   opacity: 0.5
        // }}


        className="table-controls-container"

      >
        {/* table controls */}
        {
          overWrapper && (
            <div
              ref={(node) => {
                controlsRef.current = node
              }}
              className="table-controls"
            // style={{
            //   position: 'absolute',
            //   inset: 0,
            //   pointerEvents: 'none', // lets editor interactions pass through
            //   zIndex: 50,
            //   overflow: 'visible',

            // }}
            >

              {/* Row add button */}
              {
                overLastRow && (
                  <button
                    style={{
                      // position: 'absolute',
                      // left: '0',
                      // bottom: '12px',
                      width: `${tableWidth}px`,
                      // height: '10px',
                      // background: 'green',
                      // zIndex: 48,
                      // marginLeft: `${correction}px`,
                      // pointerEvents: 'auto'
                    }}
                    className="row-add-btn"
                  >
                    <Plus
                      className="shrink-0"
                      size={15} />
                  </button>

                )
              }

              {/* Column add button */}
              {
                overLastCol && (
                  <button
                    style={{
                      // position: 'absolute',
                      // top: '0',
                      // bottom: '0',
                      left: `${tableWidth + 30}px`,
                      height: `${tableHeight}px`,
                      // background: 'pink',
                      // width: '10px',
                      // zIndex: 48,
                      // marginTop: `${correction}px`,
                      // pointerEvents: 'auto'
                      // transform: `translate(${rect?.x}px, ${rect?.y}px)`,
                    }}
                    className="column-add-btn"
                  >
                    <Plus
                      className="shrink-0"
                      size={15} />
                  </button>
                )
              }

              {/* column handle */}
              <button
                style={{
                  // position: 'absolute',
                  left: `${columnX}px`,
                  width: `${columnWidth}px`,
                  // top: '12px',
                  // height: '10px',
                  // background: 'blue',
                  // zIndex: 48,
                  // marginLeft: `${correction}px`
                }}
                className="column-handle"
              >
                <GripHorizontal
                  className="shrink-0"
                  size={15} />
              </button>

              {/* row handle */}
              <button
                style={{
                  // position: 'absolute',
                  // left: '6px',
                  top: `${rowY}px`,
                  // width: '10px',
                  height: `${rowHeight}px`,
                  // background: 'orange',
                  // zIndex: 48,
                  // marginTop: `${correction}px`
                }}
                className="row-handle"
              >
                <GripVertical
                  className="shrink-0"
                  size={15}
                />
              </button>


            </div>
          )
        }

        <div
          className="table-wrapper"
          style={{
            padding: '25px'
          }}
        >
          <NodeViewContent
            style={{
              display: 'contents'
            }}
            as={"table" as any}
          />
        </div>
      </div>

    </NodeViewWrapper>
  )
}