import { Plugin, PluginKey } from "@tiptap/pm/state"
import type { Comment } from "../comment/types"

export type CommentState = {
  comments: Comment[]
}

export const commentSectionPluginKey = new PluginKey('commentSectionPlugin')

export const CommentSectionPlugin = () => {

  return {
    plugin: new Plugin<CommentState>({
      key: commentSectionPluginKey,

      state: {
        init: () => {
          return { comments: [] }
        },

        apply(tr, prev) {
          const meta = tr.getMeta(commentSectionPluginKey)
          if (!meta) return prev

          switch (meta.type) {
            case 'add':
              return { comments: [...prev.comments, meta.comment] }

            case 'reply':
              return {
                comments: prev.comments.map(c =>
                  c.id === meta.id
                    ? { ...c, messages: [...c.messages, meta.message] }
                    : c
                ),
              }

            case 'remove':
              return {
                comments: prev.comments.filter(c => c.id !== meta.id),
              }

            default:
              break
          }
          const updateDraft = tr.getMeta('updateDraft')
          if (updateDraft) {
            prev.comments.forEach(c => {
              if (c.id === updateDraft.id) {
                c.draft = { text: updateDraft.text }
              }
            })
            return { comments: prev.comments }
          }
          const submitDraft = tr.getMeta('submitDraft')
          if (submitDraft) {

            const c = prev.comments.find(c => c.id === submitDraft.id)
            if (!c?.draft) return prev

            c.messages.push({
              id: crypto.randomUUID(),
              text: c.draft.text,
              authorId: submitDraft.user.id,
              createdAt: Date.now(),
            })

            c.draft = null

          }
          return prev
        }
      },
    })
  }
}