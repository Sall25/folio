import { Extension } from "@tiptap/react"
import { GutterPlugin, NodeSelectionPlugin } from "./GutterPlugin"

export const GutterMenuExtension = Extension.create({
  name: 'gutterMenu',
  addProseMirrorPlugins: () => {
    return [GutterPlugin, NodeSelectionPlugin]
  }
})