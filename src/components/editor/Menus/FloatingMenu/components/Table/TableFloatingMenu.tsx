import { Editor } from "@tiptap/react"
import { ColumnFloatingMenu } from "./ColumnFloatingMenu"
import { RowAddFloatingMenu } from "./RowAddFloatingMenu"
import { ColumnAddFloatingMenu } from "./ColumnAddFloatingMenu"
import { CellFloatingMenu } from "./CellFloatingMenu"
import { RowFloatingMenu } from "./RowFloatingMenu"

export function TableFloatingMenu({ editor }: { editor: Editor }) {

  return (
    <>
      <ColumnFloatingMenu
        editor={editor}
      />
      <RowFloatingMenu
        editor={editor}
      />
      <ColumnAddFloatingMenu
        editor={editor}
      />
      <RowAddFloatingMenu
        editor={editor}
      />

      <CellFloatingMenu
        editor={editor} />

    </>
  )
}
