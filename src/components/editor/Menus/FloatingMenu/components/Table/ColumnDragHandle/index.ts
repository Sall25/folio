import type { ComputePositionConfig } from "@floating-ui/dom"
import { Extension } from "@tiptap/core"

interface ColumnDragHandleOptions {
  locked?: boolean
}


export * from './columnDragHandlePlugin'

export const defaultComputePositionConfig: ComputePositionConfig = {
  placement: 'left-start',
  strategy: 'absolute',
}


declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columnDragHandle: {
      lockColumnDragHandle: () => ReturnType

      unlockColumnDragHandle: () => ReturnType

      toggleColumnDragHandle: () => ReturnType
    }
  }
}

export const ColumnDragHandle = Extension.create<ColumnDragHandleOptions>({
  name: 'columnDragHandle',

  addOptions() {
    return {
      locked: false
    }
  },


  addCommands() {
    return {
      lockColumnDragHandle:
        () =>
          ({ editor }) => {
            this.options.locked = true
            return editor.commands.setMeta('lockColumnDragHandle', this.options.locked)
          },

      unlockColumnDragHandle:
        () =>
          ({ editor }) => {
            this.options.locked = false
            return editor.commands.setMeta('lockColumnDragHandle', this.options.locked)
          },

      toggleColumnDragHandle:
        () =>
          ({ editor }) => {
            this.options.locked = !this.options.locked
            return editor.commands.setMeta('lockColumnDragHandle', this.options.locked)
          }
    }
  }
})

import { ColumnDragHandle as ColumnDragHandleComponent } from "./ColumnDragHandle"

export {
  ColumnDragHandleComponent
}