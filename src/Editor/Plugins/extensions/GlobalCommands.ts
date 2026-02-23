import { Extension } from "@tiptap/core";
import {
  insertLineAfter as insertLineAfterCmd
} from "../commands/insertLineAfter";
import {
  hideDragHandle as hideDragHandleCmd
} from '../commands/hideDragHandle'

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
    }
  }
})