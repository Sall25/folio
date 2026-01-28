/* eslint-disable @typescript-eslint/no-explicit-any */


import { Emoji } from '@tiptap/extension-emoji'
import { ReactRenderer } from '@tiptap/react'
import { EmojiList } from './EmojiList'
import { githubStyleEmojis } from './emojis'

import tippy, { type Instance as TippyInstance } from 'tippy.js'

export const EmojiExtension = Emoji.configure({
  emojis: githubStyleEmojis,
  enableEmoticons: true,
  suggestion: {
    items: ({ editor, query }) => {
      return editor.storage.emoji.emojis
        .filter(({ shortcodes, tags }) => {
          return (
            shortcodes.find(shortcode => shortcode.startsWith(query.toLowerCase())) ||
            tags.find(tag => tag.startsWith(query.toLowerCase()))
          )
        }).slice(0, 5)
    },
    allowSpaces: false,

    render: () => {
      let component: ReactRenderer<any>;
      let popup: TippyInstance;

      return {
        onStart: (props: any) => {
          component = new ReactRenderer(EmojiList, {
            props,
            editor: props.editor,
          });

          popup = tippy(document.body, {
            getReferenceClientRect: props.clientRect,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            placement: 'bottom-start',
          });
        },

        onUpdate: (props: any) => {
          component.updateProps(props);
          popup.setProps({
            getReferenceClientRect: props.clientRect,
          });
        },

        onKeyDown: (props: any) => component.ref?.onKeyDown(props),

        onExit: () => {
          component.destroy();
          popup.destroy();
        },
      };
    }

  },
});