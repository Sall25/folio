import { Extension } from "@tiptap/core";
import {
  insertLineAfter as insertLineAfterCmd
} from "../commands/insertLineAfter";
import {
  hideDragHandle as hideDragHandleCmd
} from '../commands/hideDragHandle'
import {
  clearSelection as clearSelectionCmd
} from '../commands/clearSelection'

export const GlobalCommands = Extension.create({
  name: 'globalCommandsExtension',

  addCommands() {
    return {
      insertLineAfter(pos) {
        return insertLineAfterCmd(pos)
      },
      hideDragHandle() {
        return hideDragHandleCmd()
      },
      clearSelection(pos) {
        return clearSelectionCmd(pos)
      },
    }
  }
})