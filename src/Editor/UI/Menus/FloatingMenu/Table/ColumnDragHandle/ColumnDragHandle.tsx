
import type { Node } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { ColumnDragHandlePlugin, columnDragHandlePluginDefaultKey, type ColumnDragHandlePluginProps } from './columnDragHandlePlugin'
import { defaultComputePositionConfig } from '.'


type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>

export type ColumnDragHandleProps = Omit<Optional<ColumnDragHandlePluginProps, 'pluginKey'>, 'element'> & {
  className?: string
  onNodeChange?: (data: { node: Node | null; editor: Editor; pos: number }) => void
  children: ReactNode
}

export const ColumnDragHandle = (props: ColumnDragHandleProps) => {
  const {
    className = 'column-drag-handle',
    children,
    editor,
    pluginKey = columnDragHandlePluginDefaultKey,
    onColumnNodeChange,
    computePositionConfig = defaultComputePositionConfig
  } = props

  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const plugin = useRef<Plugin | null>(null)

  useEffect(() => {
    let initPlugin: {
      plugin: Plugin,
      unbind: () => void
    } | null = null

    if (!element) {
      return () => {
        plugin.current = null
      }
    }
    if (editor.isDestroyed) {
      return () => {
        plugin.current = null
      }
    }
    if (!plugin.current) {
      initPlugin = ColumnDragHandlePlugin({
        editor,
        element,
        pluginKey,
        computePositionConfig: {
          ...defaultComputePositionConfig,
          ...computePositionConfig
        },
        onColumnNodeChange
      })
      plugin.current = initPlugin.plugin

      editor.registerPlugin(plugin.current)
    }

    return () => {
      editor.unregisterPlugin(pluginKey)
      plugin.current = null
      if (initPlugin) {
        initPlugin.unbind()
        initPlugin = null
      }
    }
  }, [element, editor, onColumnNodeChange, pluginKey, computePositionConfig])

  return (
    <div
      className={className}
      style={{ visibility: 'hidden', position: 'absolute' }}
      data-dragging="false"
      ref={setElement}
    >
      {children}
    </div>
  )

}
