import { Editor } from "@tiptap/react";

export function findSlashQuery(state: Editor['state']) {
  const { $from } = state.selection

  if (!$from.parent.isTextblock) return null

  const textBefore = $from.parent.textBetween(
    0,
    $from.parentOffset,
    undefined,
    '\ufffc'
  )

  const match = /(?:^|\s)\/([\w]*)$/.exec(textBefore)
  if (!match) return null

  const query = match[1]
  const from = $from.start() + match.index + match[0].indexOf('/')
  const to = from + match[0].length

  return { query, from, to }
}
