import { Extension } from "@tiptap/core"
import type { MeasuredThread, PositionedThread, Thread } from "../types"
import { draftThread } from "./utils/draftThread"
import { submitThread } from "./utils/submitThread"
import { removeThread } from "./utils/removeThread"
import { resolveThread } from "./utils/resolveThread"
import { unresolveThread } from "./utils/unresolveThread"
import { updateComment } from "./utils/updateComment"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { mapThreads } from "./utils/mapThreads"
import { measureAllThreads } from "./utils/measureAllThreads"
import { resolveThreadCollisions } from "./utils/resolveThreadCollisions"
import { resolveActiveThreadCollisions } from "./utils/resolveActiveThreadCollisions"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import { addComment } from "./utils/addComment"
import { removeComment } from "./utils/removeComment"
import { scrollToThread } from "./utils/scrollToThread"

interface CommentThreadStorage {
  draftId: string | null
}

declare module '@tiptap/core' {
  interface Storage {
    commentThreadExtension: CommentThreadStorage
  }
}

export interface CommentThreadState {
  threads: Thread[]
  measuredThreads: MeasuredThread[]
  positionedThreads: PositionedThread[]
  selectedThreads: Thread[],
  selectedThread: Thread | null,
  threadId: string | null
}

export const commentThreadPluginKey = new PluginKey('commentThreadPlugin')

export const CommentThreadExtension = Extension.create<unknown, CommentThreadStorage>({
  name: 'commentThreadExtension',

  addStorage() {
    return {
      draftId: null
    }
  },

  addCommands() {
    return {
      draftThread() {
        return ({ editor }) => {
          draftThread(editor)
          return true
        }
      },
      submitThread(content) {
        return ({ editor }) => {
          submitThread(editor, content)
          return true
        }
      },
      removeThread(threadId) {
        return ({ editor }) => {
          removeThread(editor, threadId)
          return true
        }
      },
      selectThread(threadId) {
        return ({ dispatch, tr }) => {
          if (dispatch) {
            dispatch(
              tr.setMeta(commentThreadPluginKey, { type: 'selectThread', threadId })
            )
          }
          return true
        }
      },
      unselectThread(threadId) {
        return ({ dispatch, tr }) => {
          if (dispatch) {
            dispatch(
              tr.setMeta(commentThreadPluginKey, { type: 'unselectThread', threadId })
            )
          }
          return true
        }
      },
      hoverThread(threadId) {
        return ({ dispatch, tr }) => {
          if (dispatch) {
            dispatch(
              tr.setMeta(commentThreadPluginKey, { type: 'hoverThread', threadId })
            )
          }
          return true
        }
      },
      hoverOffThread(threadId) {
        return ({ dispatch, tr }) => {
          if (dispatch) {
            dispatch(
              tr.setMeta(commentThreadPluginKey, { type: 'unhoverThread', threadId })
            )
          }
          return true
        }
      },
      resolveThread(threadId) {
        return ({ editor }) => {
          resolveThread(editor, threadId)

          return true
        }
      },
      unresolveThread(threadId) {
        return ({ editor }) => {
          unresolveThread(editor, threadId)

          return true
        }
      },
      addComment(threadId, authorId, text) {
        return ({ editor }) => {

          addComment(editor, threadId, authorId, text)
          return true
        }
      },
      removeComment(threadId, commentId) {
        return ({ editor }) => {

          removeComment(editor, threadId, commentId)
          return true
        }
      },
      updateComment(threadId, commentId, newText) {
        return ({ editor }) => {
          updateComment(editor, threadId, commentId, newText)

          return true
        }
      },
      forceMeasure(threadId) {
        return ({ dispatch, tr }) => {
          if (dispatch) {
            dispatch(
              tr.setMeta(commentThreadPluginKey, { type: 'forceMeasure', threadId })
            )
          }
          return true
        }
      },
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    return [
      new Plugin<CommentThreadState>({
        key: commentThreadPluginKey,

        state: {
          init: () => {
            return {
              threads: [],
              measuredThreads: [],
              positionedThreads: [],
              selectedThreads: [],
              selectedThread: null,
              threadId: null
            }
          },

          apply(tr, next) {

            const meta = tr.getMeta(commentThreadPluginKey)
            if (!meta) return next

            //   const thread = next.threads.find(thread => thread.id === meta.threadId)
            // if (!thread) return next

            switch (meta.type) {

              case 'addComment': {
                next.threads = next.threads.map(t => {
                  if (t.id !== meta.threadId) return t

                  return {
                    ...t,
                    comments: [
                      ...t.comments,
                      {
                        id: crypto.randomUUID(),
                        threadId: meta.threadId,
                        text: meta.text,
                        authorId: meta.authorId,
                        createdAt: Date.now()
                      }
                    ]
                  }
                })
              }
                break

              case 'removeComment': {
                next.threads = next.threads.map(t => {
                  if (t.id !== meta.threadId) return t

                  return {
                    ...t,
                    comments: t.comments.filter(c => c.id !== meta.commentId)
                  }
                })
              }
                break

              case 'updateComment': {
                next.threads = next.threads.map(t => {
                  if (t.id !== meta.threadId) return t

                  return {
                    ...t,
                    comments: t.comments.map(comment => (
                      comment.id === meta.commentId ? { ...comment, text: meta.newText } : comment
                    ))
                  }
                })
              }
                break
              case 'removeThread': {
                const newThreads = next.threads.filter(t => t.id !== meta.threadId)
                next.threads = newThreads
              }
                break

              case 'resolveThread': {
                const newThreads = next.threads.map(t => (
                  t.id === meta.t ? { ...t, status: 'resolved' } : t
                ))
                next.threads = newThreads as Thread[]
              }
                break

              case 'unresolveThread': {
                const newThreads = next.threads.map(t => (
                  t.id === meta.t ? { ...t, status: 'open' } : t
                ))
                next.threads = newThreads as Thread[]
              }
                break

              case 'selectThread':
              case 'forceMeasure': {
                const selectedThread = next.threads.find(t => t.id === meta.threadId)
                if (selectedThread) {
                  next.selectedThread = selectedThread
                }
              }
                break

              case 'unselectThread': {
                const selectedThread = next.threads.find(t => t.id === meta.threadId)
                if (selectedThread) {
                  next.selectedThread = null
                }
                // next.selectedThreads = []
                // next.selectedThread = null
              }
                break

              case 'hoverThread': {
                const hoveredThread = next.threads.find(t => t.id === meta.threadId)
                if (hoveredThread) {
                  const alreadySelected = next.selectedThreads.some(t => t.id === hoveredThread.id)
                  if (!alreadySelected) {
                    next.selectedThreads.push(hoveredThread)
                  }
                }
              }
                break

              case 'unhoverThread': {
                const newSelectedThreads = next.selectedThreads.filter(s => s.id !== meta.threadId)
                next.selectedThreads = newSelectedThreads
              }
                break

              case 'draftThread': {
                next.threads.push({
                  id: meta.threadId,
                  content: '',
                  anchor: { from: meta.from, to: meta.to },
                  status: 'drafted',
                  comments: []
                })
                editor.storage.commentThreadExtension.draftId = meta.threadId
                console.log('apply draft ')
              }
                break

              case 'submitThread': {
                next.threads = next.threads.map(t => {
                  if (t.id !== meta.threadId) return t

                  return {
                    ...t,
                    status: 'open',
                    comments: [
                      ...t.comments,
                      {
                        id: crypto.randomUUID(),
                        threadId: meta.threadId,
                        authorId: 'You',
                        text: meta.content,
                        createdAt: Date.now()
                      }
                    ]
                  }
                })

                editor.storage.commentThreadExtension.draftId = null
              }
                break
              default:
                break
            }

            next.threads = mapThreads(tr, next.threads)

            next.measuredThreads = measureAllThreads(editor, next.threads)
            next.positionedThreads = resolveThreadCollisions(next.measuredThreads)

            if (meta.type === 'selectThread') {
              next.positionedThreads = resolveActiveThreadCollisions(next.measuredThreads, meta.threadId)
            }

            // if (tr.getMeta('force-measure')) {
            //   const measuredThreads = measureAllThreads(editor, next.threads)
            //   const positionedThreads = resolveThreadCollisions(measuredThreads)

            //   next.measuredThreads = measuredThreads
            //   next.positionedThreads = positionedThreads

            //   console.log('positioned', next.positionedThreads)
            // }

            // if (tr.getMeta('thread-hovered')) {
            //   const { selectedId } = tr.getMeta('thread-hovered')
            //   const selectedThread = next.threads.find(thread => thread.id === selectedId)
            //   if (selectedThread) {
            //     next.selectedThreads = updateSelectedThreads(next.selectedThreads, selectedThread, 'select')
            //   }
            // }

            // if (tr.getMeta('thread-hovered-off')) {
            //   const { selectedId } = tr.getMeta('thread-hovered-off')
            //   const selectedThread = next.threads.find(thread => thread.id === selectedId)
            //   if (selectedThread) {
            //     next.selectedThreads = updateSelectedThreads(next.selectedThreads, selectedThread, 'unselect')
            //   }
            // }

            // if (tr.getMeta('thread-selected')) {
            //   const measuredThreads = measureAllThreads(editor, threads)
            //   let positionedThreads = resolveThreadCollisions(measuredThreads)

            //   const { selectedId } = tr.getMeta('thread-selected')

            //   positionedThreads = resolveActiveThreadCollisions(measuredThreads, selectedId)

            //   next.measuredThreads = measuredThreads
            //   next.positionedThreads = positionedThreads

            //   const selectedThread = next.threads.find(thread => thread.id === selectedId)
            //   if (selectedThread) {
            //     next.selectedThreads = updateSelectedThreads(next.selectedThreads, selectedThread, 'select')
            //     next.selectedThread = selectedThread
            //   }
            // }

            // if (tr.getMeta('thread-unselected')) {
            //   const measuredThreads = measureAllThreads(editor, threads)
            //   const positionedThreads = resolveThreadCollisions(measuredThreads)

            //   next.measuredThreads = measuredThreads
            //   next.positionedThreads = positionedThreads

            //   next.selectedThreads = []
            //   next.selectedThread = null
            // }

            return next
          },

        },
        view() {
          return {
            update(view, prevState) {
              const state = view.state

              // Only run if selection changed
              if (prevState.selection.eq(state.selection)) return

              const pluginState = commentThreadPluginKey.getState(state)
              if (!pluginState) return

              const { threads } = pluginState as CommentThreadState
              const { from, to } = state.selection

              // Find threads overlapping the selection
              const focusedThreads = threads.filter(thread => {
                return (
                  thread.anchor.from <= to &&
                  thread.anchor.to >= from
                )
              })

              const tr = state.tr

              if (focusedThreads.length > 0) {
                tr.setMeta(commentThreadPluginKey, {
                  type: 'selectThread',
                  threadId: focusedThreads[0].id,
                })
                scrollToThread(focusedThreads[0].id)

              } else if (pluginState.selectedThread) {
                tr.setMeta(commentThreadPluginKey, {
                  type: 'unselectThread',
                  threadId: pluginState.selectedThread.id
                })

              }

              if (tr.docChanged || tr.getMeta(commentThreadPluginKey)) {
                view.dispatch(tr)
              }


            },
          }
        },
      }),

      new Plugin({
        key: new PluginKey('commentThreadDecorationPlugin'),


        state: {
          init: () => DecorationSet.empty,

          apply(tr, oldDecorations, _, newState) {
            const pluginState = commentThreadPluginKey.getState(newState)

            if (!pluginState) return oldDecorations.map(tr.mapping, tr.doc)

            const { selectedThreads, threads } = pluginState as CommentThreadState

            const decorations: Decoration[] = []

            for (const thread of threads) {
              const isSelected = selectedThreads.some(t => t.id === thread.id)

              decorations.push(
                Decoration.inline(
                  thread.anchor.from,
                  thread.anchor.to,
                  {
                    class: isSelected
                      ? "thread-anchor selected"
                      : "thread-anchor",
                    "data-thread-id": thread.id,
                  }
                )
              )
            }

            return DecorationSet.create(newState.doc, decorations)
          },
        },

        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      })
    ]
  },
})