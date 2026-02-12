/* eslint-disable @typescript-eslint/no-explicit-any */


import Emoji, { type EmojiItem } from '@tiptap/extension-emoji'
import { ReactRenderer } from '@tiptap/react'
import { EmojiList } from './EmojiList'
import { computePosition, type VirtualElement } from '@floating-ui/dom'

export const gitHubEmojis: EmojiItem[] = [
  {
    name: "smile",
    shortcodes: ["smile"],
    tags: ["happy", "joy", "face"],
    emoji: "😄",
    fallbackImage: "https://github.githubassets.com/images/icons/emoji/unicode/1f604.png",
  },
  {
    name: "thumbsup",
    shortcodes: ["thumbsup", "like", "+1"],
    tags: ["approve", "ok", "good"],
    emoji: "👍",
    fallbackImage: "https://github.githubassets.com/images/icons/emoji/unicode/1f44d.png",
  },
  {
    name: "heart",
    shortcodes: ["heart", "love"],
    tags: ["like", "favorite", "love"],
    emoji: "❤️",
    fallbackImage: "https://github.githubassets.com/images/icons/emoji/unicode/2764.png",
  },
  {
    name: "rocket",
    shortcodes: ["rocket"],
    tags: ["launch", "ship", "deploy"],
    emoji: "🚀",
    fallbackImage: "https://github.githubassets.com/images/icons/emoji/unicode/1f680.png",
  },
  {
    name: "tada",
    shortcodes: ["tada", "congrats", "party"],
    tags: ["celebrate", "congratulations"],
    emoji: "🎉",
    fallbackImage: "https://github.githubassets.com/images/icons/emoji/unicode/1f389.png",
  },
  {
    name: "bug",
    shortcodes: ["bug"],
    tags: ["issue", "problem", "error"],
    emoji: "🐛",
    fallbackImage: "https://github.githubassets.com/images/icons/emoji/unicode/1f41b.png",
  },
  {
    name: "eyes",
    shortcodes: ["eyes", "look"],
    tags: ["watch", "attention"],
    emoji: "👀",
    fallbackImage: "https://github.githubassets.com/images/icons/emoji/unicode/1f440.png",
  },
  {
    name: "fire",
    shortcodes: ["fire", "hot"],
    tags: ["lit", "awesome"],
    emoji: "🔥",
    fallbackImage: "https://github.githubassets.com/images/icons/emoji/unicode/1f525.png",
  },
  {
    name: "clap",
    shortcodes: ["clap"],
    tags: ["applause", "congrats"],
    emoji: "👏",
    fallbackImage: "https://github.githubassets.com/images/icons/emoji/unicode/1f44f.png",
  },
  {
    name: "thinking",
    shortcodes: ["thinking"],
    tags: ["ponder", "question"],
    emoji: "🤔",
    fallbackImage: "https://github.githubassets.com/images/icons/emoji/unicode/1f914.png",
  },
];



export const EmojiExtension = Emoji.configure({
  emojis: gitHubEmojis,
  enableEmoticons: true,

  HTMLAttributes: {
    class: 'emoji'
  },

  suggestion: {
    items: async ({ editor, query }) => {
      return editor.storage.emoji.emojis
        .filter(({ shortcodes, tags }) => {
          return (
            shortcodes.find(shortcode => shortcode.startsWith(query.toLowerCase())) ||
            tags.find(tag => tag.startsWith(query.toLowerCase()))
          )
        }).slice(0, 5)
    },
    allowSpaces: false,
    char: ':',

    command: ({ editor, range, props }) => {
      // Remove the trigger character and any query text
      const { tr } = editor.state
      tr.deleteRange(range.from, range.to)
      editor.view.dispatch(tr)
      // Execute the selected command
      props.command(editor)

      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: 'emoji',
            attrs: {
              id: props.id,
              name: props.name,
              emoji: props.emoji
            }
          }])
        .run()
      // editor
      //   .chain()
      //   .focus()
      //   .setEmoji(props.name) // 
      //   .run()
      //   return true // 
    },

    /*
    command: ({ editor, range, props }: { editor: any, range: any, props: any }) => {
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: 'mention',
            attrs: {
              id: props.id,
              label: props.label,
              mentionSuggestionChar: '@',
            },
          },
          { type: 'text', text: ' ' },
        ])
        .run()
    },
    */

    render: () => {
      let component: ReactRenderer<any>;

      const updatePosition = (clientRect: any, element: HTMLElement) => {
        const virtualEl: VirtualElement = {
          getBoundingClientRect: () => clientRect //posToDOMRect(editor.view, editor.state.selection.from, editor.state.selection.to)
        }



        computePosition(virtualEl, element, {
          placement: 'bottom-start',
          // strategy: 'absolute',
          // middleware: [shift(), flip()]
        }).then(pos => {
          Object.assign(component.element.style, {
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            position: pos.strategy === 'fixed' ? 'fixed' : 'absolute',
          })
        })
      }

      return {
        onStart: (props: any) => {
          component = new ReactRenderer(EmojiList, {
            props,
            editor: props.editor,
          });


          document.body.appendChild(component.element)

          updatePosition(props.clientRect(), component.element)
        },

        onUpdate: (props: any) => {
          component.updateProps(props);
          updatePosition(props.clientRect(), component.element)
        },

        onKeyDown: (props: any) => component.ref?.onKeyDown(props) ?? false,

        onExit: () => {
          if (document.body.contains(component.element)) {
            document.body.removeChild(component.element)
          }
          component.destroy()
        },
      };
    }

  },
});