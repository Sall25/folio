import { Extension } from "@tiptap/core";
// import {
//   addComment as addCommentCmd,
//   replyComment as replyCommentCmd,
//   removeComment as removeCommentCmd,
//   updateDraft as updateDraftCmd,
//   submitDraft as submitDraftCmd
// } from "../comment/commands";
import { CommentDecorations } from "./CommentDecorations";

interface CommentStorage {
  currentCommentId: string | null
  currentUserId: string | null
}

declare module '@tiptap/core' {
  interface Storage {
    commentExtension: CommentStorage
  }
}

export const CommentExtension = Extension.create<unknown, CommentStorage>({
  name: 'commentExtension',

  addStorage() {
    return {
      currentCommentId: null,
      currentUserId: null
    }
  },

  addProseMirrorPlugins() {
    return [
      CommentDecorations(this.editor)
    ]
  },


  // addCommands() {
  //   return {
  //     addComment(authorId) {
  //       return addCommentCmd(authorId)
  //     },
  //     replyComment(commentId, text, authorId) {
  //       return replyCommentCmd(commentId, text, authorId)
  //     },
  //     removeComment(id) {
  //       return removeCommentCmd(id)
  //     },
  //     submitDraft() {
  //       return submitDraftCmd()
  //     },
  //     updateDraft(text) {
  //       return updateDraftCmd(text)
  //     },
  //   }
  // }
})