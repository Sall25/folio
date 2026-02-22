import { Extension } from "@tiptap/core"
import { InputRule, inputRules } from "@tiptap/pm/inputrules"
import { createTable } from "./utils.ts"
import { TextSelection } from "@tiptap/pm/state"

const TABLE_PATTERN = /^\|(\d+)x(\d+)\|$/

export const TableShortcutInputRules = Extension.create({
  name: "tableShortcutInputRule",

  addProseMirrorPlugins() {
    return [
      inputRules({
        rules: [
          new InputRule(TABLE_PATTERN, (state, match, start, end) => {
            if (!match) return null

            const rows = Number(match[1])
            const cols = Number(match[2])

            // Safety limits (VERY important to avoid freezing editor)
            if (rows > 50 || cols > 20) return null

            const { tr, schema } = state

            const tableNode = createTable(schema, rows, cols)

            // Replace the typed |NxM| text with the table
            tr.replaceWith(start, end, tableNode)

            // Move cursor into first cell
            tr.setSelection(
              // put selection inside the table
              // +3 navigates: table → row → cell → paragraph
              TextSelection.create(tr.doc, tr.doc.resolve(start + 3).pos)
            )

            return tr
          })
        ]
      })
    ]
  }
})