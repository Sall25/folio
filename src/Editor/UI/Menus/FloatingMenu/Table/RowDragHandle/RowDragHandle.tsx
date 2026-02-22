import type { Node } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import {
  RowDragHandlePlugin,
  rowDragHandlePluginDefaultKey,
  type RowDragHandlePluginProps
} from './rowDragHandlePlugin'
import { defaultComputePositionConfig } from '.'

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>

export type RowDragHandleProps =
  Omit<Optional<RowDragHandlePluginProps, 'pluginKey'>, 'element'> & {
    className?: string
    onNodeChange?: (data: { node: Node | null; editor: Editor; pos: number }) => void
    children: ReactNode
  }

export const RowDragHandleComponent = (props: RowDragHandleProps) => {
  const {
    className = 'row-drag-handle',
    children,
    editor,
    pluginKey = rowDragHandlePluginDefaultKey,
    onRowNodeChange,
    computePositionConfig = defaultComputePositionConfig,
  } = props

  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const plugin = useRef<Plugin | null>(null)

  useEffect(() => {
    let initPlugin: {
      plugin: Plugin
      unbind: () => void
    } | null = null

    // React ref not mounted yet
    if (!element) {
      return () => {
        plugin.current = null
      }
    }

    // Editor already destroyed (important during hot reload / remount)
    if (editor.isDestroyed) {
      return () => {
        plugin.current = null
      }
    }

    // Register plugin once
    if (!plugin.current) {
      initPlugin = RowDragHandlePlugin({
        editor,
        element,
        pluginKey,
        computePositionConfig: {
          ...defaultComputePositionConfig,
          ...computePositionConfig,
        },
        onRowNodeChange,
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
  }, [element, editor, onRowNodeChange, pluginKey, computePositionConfig])

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
