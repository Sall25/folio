import { Extension } from "@tiptap/core";
import {
  insertLineAfter as insertLineAfterCmd
} from "../commands/insertLineAfter";
import {
  triggerCommandsSuggestion as triggerCommandsSuggestionCmd
} from '../commands/triggerCommandsSuggestion'
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
      triggerCommandsSuggestion(pos) {
        return triggerCommandsSuggestionCmd(pos)
      },
      hideDragHandle() {
        return hideDragHandleCmd()
      },
    }
  }
})