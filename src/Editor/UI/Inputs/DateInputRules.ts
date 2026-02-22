
import { Extension } from "@tiptap/core"
import { InputRule, inputRules } from "@tiptap/pm/inputrules"

const todayRegex = /^\/today\s$/i
const nowRegex = /^\/now\s$/i
const dueRegex = /^\/due\s(\d+)d\s$/i

function formatDate(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatDateTime(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function dateInputRule() {
  return [
    new InputRule(todayRegex, (state, _match, start, end) => {
      const { tr, schema } = state
      tr.replaceWith(start, end, schema.text(formatDate(new Date())))
      return tr
    }),

    new InputRule(nowRegex, (state, _match, start, end) => {
      const { tr, schema } = state
      tr.replaceWith(start, end, schema.text(formatDateTime(new Date())))
      return tr
    }),

    new InputRule(dueRegex, (state, match, start, end) => {
      if (!match) return null
      const days = Number(match[1])
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + days)

      const { tr, schema } = state
      tr.replaceWith(start, end, schema.text(formatDate(dueDate)))
      return tr
    })
  ]
}


export const DateInputRules = Extension.create({
  name: 'dateInputRules',

  addProseMirrorPlugins() {
    return [
      inputRules({
        rules: [
          ...dateInputRule()
        ]
      })
    ]
  },
})