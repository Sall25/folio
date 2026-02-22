import type { ComputePositionConfig } from "@floating-ui/dom"
import { Extension } from "@tiptap/core"

interface RowDragHandleOptions {
  locked?: boolean
}

export * from './rowDragHandlePlugin'

export const defaultComputePositionConfig: ComputePositionConfig = {
  placement: 'left-end',
  strategy: 'absolute',
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    rowDragHandle: {
      lockRowDragHandle: () => ReturnType
      unlockRowDragHandle: () => ReturnType
      toggleRowDragHandle: () => ReturnType
    }
  }
}

export const RowDragHandle = Extension.create<RowDragHandleOptions>({
  name: 'rowDragHandle',

  addOptions() {
    return {
      locked: false,
    }
  },

  addCommands() {
    return {
      lockRowDragHandle:
        () =>
          ({ editor }) => {
            this.options.locked = true
            return editor.commands.setMeta('lockRowDragHandle', this.options.locked)
          },

      unlockRowDragHandle:
        () =>
          ({ editor }) => {
            this.options.locked = false
            return editor.commands.setMeta('lockRowDragHandle', this.options.locked)
          },

      toggleRowDragHandle:
        () =>
          ({ editor }) => {
            this.options.locked = !this.options.locked
            return editor.commands.setMeta('lockRowDragHandle', this.options.locked)
          },
    }
  },
})
