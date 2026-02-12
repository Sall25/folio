import { Editor } from "@tiptap/react"
import type { ColorType, MenuItem, RecentType } from "../types"

export abstract class EditorNode {
  public editor: Editor
  public pos: number
  recentColors: RecentType[] | undefined
  addRecentColor: ((c: ColorType) => void) | undefined

  constructor(editor: Editor, pos: number)

  constructor(
    editor: Editor,
    pos: number,
    recentColors?: RecentType[] | undefined,
    addRecentColor?: (c: ColorType) => void | undefined
  ) {
    this.editor = editor
    this.pos = pos
    this.recentColors = recentColors ?? undefined
    this.addRecentColor = addRecentColor ?? undefined
  }

  delete() {
    this.editor.commands.deleteNodeAt(this.pos)
  }

  copyToClipboard() {
    this.editor.commands.copyNodeToClipboard(this.pos)
  }

  duplicate() {
    this.editor.commands.duplicateNode(this.pos)
  }

  abstract getMenuItems(): MenuItem[]
}