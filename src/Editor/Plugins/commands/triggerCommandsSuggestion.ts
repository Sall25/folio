import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    triggerCommandsSuggestion: {
      triggerCommandsSuggestion: (pos: number) => ReturnType
    }
  }
}

export const triggerCommandsSuggestion: RawCommands['triggerCommandsSuggestion'] =
  (pos) =>
    ({ state, editor }) => {
      return true

      // // Mark this transaction as a suggestion trigger
      // tr.setMeta(mySuggestionKey, {
      //   action: 'start',
      //   range: { from, to: from + char.length },
      //   query: '',
      //   text: char,
      // })

      // view.dispatch(tr)

      // // Move cursor after the char
      // const newPos = from + char.length
      // view.dispatch(
      //   view.state.tr.setSelection(TextSelection.create(view.state, newPos))
      // )
    }
