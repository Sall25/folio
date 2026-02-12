import { autoUpdate, computePosition, offset, type VirtualElement } from '@floating-ui/dom';
import { Editor } from '@tiptap/core';
import { GripVertical, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { gutterPluginKey, nodeSelectionPluginKey } from './extensions/GutterPlugin';
import { EditorNode, TableNode, TextBlockNode } from './classes';
import { useEditorState } from '@tiptap/react';
import type { TextBlockKind } from './types';
import { NodeDropdownContent } from './NodeDropdownContent';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'


export function GutterFloatingMenu({ editor }: { editor: Editor }) {
  const [visible, setVisible] = useState(false)
  const [ready, setReady] = useState(false)
  const posX = useRef(0)
  const posY = useRef(0)
  const posRef = useRef<number | null>(null)
  const fromRef = useRef<number | null>(null)
  const toRef = useRef<number | null>(null)
  const isPopoverOpenRef = useRef(false)
  const [node, setNode] = useState<EditorNode | null>(null)
  const nodeHeight = useRef(0)
  const floatingRef = useRef<HTMLElement | null>(null)
  const virtualRef = useRef<VirtualElement>({
    getBoundingClientRect: () => {
      return {
        x: posX.current,
        y: posY.current,
        left: posX.current,
        right: posX.current,
        top: posY.current,
        bottom: posY.current,
        width: 0,
        height: nodeHeight.current
      }
    }
  });

  const closeTimer = useRef<number | null>(null)

  const openMenu = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setVisible(true)
  }
  const scheduleClose = (delay = 300) => {
    if (isPopoverOpenRef.current) return

    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    closeTimer.current = setTimeout(() => {
      setVisible(false)
      closeTimer.current = null
      setReady(false)
    }, delay)
  }

  const updatePosition = async () => {
    if (!floatingRef.current) return
    const { x, y } = await computePosition(virtualRef.current, floatingRef.current, {
      placement: 'left-start',
      middleware: [
        offset(8)
      ]
    });
    floatingRef.current.style.transform = `translate(${x}px, ${y}px) translateY(-50%)`;
    setReady(true)
  }

  useEffect(() => {
    if (!editor) return

    const editorDom = editor.view.dom

    const update = () => {
      if (isPopoverOpenRef.current) return

      const gutterState = gutterPluginKey.getState(editor.state)
      if (!gutterState || !gutterState.rect || !gutterState.from || !gutterState.to || !gutterState.pos) return

      fromRef.current = gutterState.from
      toRef.current = gutterState.to
      posRef.current = gutterState.pos

      const { y, height } = gutterState.rect
      posX.current = editor.view.dom.getBoundingClientRect().x
      posY.current = y + 15
      nodeHeight.current = height

      updatePosition()
    }

    const handleMouseEnter = () => openMenu()
    const handleMouseLeave = () => scheduleClose()

    editor.on('transaction', update)
    editorDom.addEventListener('mouseenter', handleMouseEnter)
    editorDom.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      editor.off('transaction', update)
      editorDom.removeEventListener('mouseenter', handleMouseEnter)
      editorDom.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [editor])

  useEffect(() => {
    if (!floatingRef.current) return
    const cleanup = autoUpdate(virtualRef.current, floatingRef.current, updatePosition)

    return () => cleanup()
  }, [])

  const { onActiveChange } = useEditorState({
    editor,
    selector(context) {
      return {
        onActiveChange: (
          name: string,
          attributes?: Record<string, unknown>
        ) => context.editor.isActive(name, attributes)
      }
    },
  })

  if (!visible) return null

  return (
    <div
      ref={(node) => {
        floatingRef.current = node
      }}
      className={`gutter-floating-menu ${visible && ready ? 'isVisible' : ''}`}
      onMouseEnter={openMenu}
      onMouseLeave={() => scheduleClose()}
    >
      <button className='btn btn-plus'>
        <Plus size={24} />
      </button>

      <DropdownMenu.Root
        modal={false}
        onOpenChange={(open) => {
          isPopoverOpenRef.current = open

          if (!open) {
            //CLEAR node selection safely
            editor.view.dispatch(
              editor.state.tr.setMeta(nodeSelectionPluginKey, null)
            )
            return
          }

          if (fromRef.current == null || toRef.current == null) return

          editor.view.dispatch(
            editor.state.tr.setMeta(nodeSelectionPluginKey, {
              from: fromRef.current,
              to: toRef.current,
            })
          )
        }}

      >
        <DropdownMenu.Trigger asChild>
          <button
            className='btn btn-grip'
            onPointerDownCapture={() => {

              if (!posRef.current) return
              const node = editor.state.doc.nodeAt(posRef.current)
              if (!node) return
              const name = node.type.name

              switch (name) {
                case 'paragraph':
                case 'heading':
                case 'blockquote':
                case 'codeBlock':
                case 'listItem':
                case 'bulletList':
                case 'orderedList':
                  setNode(
                    new TextBlockNode(
                      editor,
                      posRef.current,
                      name as TextBlockKind,
                      onActiveChange
                    ))
                  break
                case 'table':
                  setNode(
                    new TableNode(
                      editor,
                      posRef.current
                    ))
                  break
                default:
                  break
              }
            }}
          >
            <GripVertical size={24} />
          </button>
        </DropdownMenu.Trigger>
        {node && <NodeDropdownContent node={node} />}
      </DropdownMenu.Root>
    </div>
  )
}