import { useEffect, useRef, useState, type ReactNode } from "react";
import { CellHandlePlugin, cellHandlePluginDefaultKey, type CellHandlePluginProps } from "./cellHandlePlugin";
import type { Plugin } from "@tiptap/pm/state";
import { defaultComputePositionConfig } from "../ColumnDragHandle";
import type { Editor } from "@tiptap/core";

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>


export type CellHandleProps =
  Omit<Optional<CellHandlePluginProps, 'pluginKey'>, 'element'> & {
    className?: string
    onNodeChange?: (data: { node: Node | null; editor: Editor; pos: number }) => void
    children: ReactNode
  }

export const CellHandle = (props: CellHandleProps)=>{
  const {
    className = 'cell-drag-handle',
    children,
    editor,
    pluginKey = cellHandlePluginDefaultKey,
    onCellNodeChange,
    computePositionConfig = defaultComputePositionConfig
  } = props

  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const plugin = useRef<Plugin | null>(null)

  useEffect(()=>{
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
      initPlugin = CellHandlePlugin({
        editor,
        element,
        pluginKey,
        computePositionConfig: {
          ...defaultComputePositionConfig,
          ...computePositionConfig,
        },
        onCellNodeChange,
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
  }, [editor, element, computePositionConfig, pluginKey, onCellNodeChange])

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