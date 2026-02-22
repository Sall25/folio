import { Extension } from "@tiptap/core";
import { InputRule, inputRules } from "@tiptap/pm/inputrules";

const emojiMap = {
  ':smile:': '😊',
  ':heart:': '❤️',
  ':thumbsup:': '👍',
  ':fire:': '🔥',
  ':rocket:': '🚀',
  ':thinking:': '🤔',
  ':party:': '🎉',
  ':coffee:': '☕',
  ':eyes:': '👀',
  ':unicorn:': '🦄'
}

export const EmojiInputRules = Extension.create({
  name: 'emojiInputRules',

  addProseMirrorPlugins() {
    return [
      inputRules({
        rules: [
          ...(Object.entries(emojiMap).map(([shortcode, emoji]) => (
            new InputRule(
              new RegExp(`(^|\\s)(${shortcode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})$`),
              (state, match, start, end) => {
                if (!match) return null

                return state.tr.replaceWith(start, end, state.schema.text(emoji))
              }
            )
          )))
        ]
      })
    ]
  },
})