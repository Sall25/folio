import { Extension } from '@tiptap/core'
import { blurSelectionPlugin } from './blurSelectionPlugin'

export const BlurSelection = Extension.create({
  name: 'blurSelection',

  addProseMirrorPlugins() {
    return [blurSelectionPlugin]
  },
})
