import { Extension } from "@tiptap/core";
import type { MeasuredThread, PositionedThread, Thread } from "../types";
import { draftThread } from "./utils/draftThread";
import { submitThread } from "./utils/submitThread";
import { removeThread } from "./utils/removeThread";
import { resolveThread } from "./utils/resolveThread";
import { unresolveThread } from "./utils/unresolveThread";
import { updateComment } from "./utils/updateComment";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import { mapThreads } from "./utils/mapThreads";
import { measureAllThreads } from "./utils/measureAllThreads";
import { resolveThreadCollisions } from "./utils/resolveThreadCollisions";
import { resolveActiveThreadCollisions } from "./utils/resolveActiveThreadCollisions";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { addComment } from "./utils/addComment";
import { removeComment } from "./utils/removeComment";
import { scrollToThread } from "./utils/scrollToThread";
import { CellSelection } from "prosemirror-tables";
import type { UseThreadSetupReturn } from "src/components/tiptap-templates/simple/hooks/use-thread-setup";

interface CommentThreadStorage {
  draftId: string | null;
}

type CommentThreadOptions = UseThreadSetupReturn;

declare module "@tiptap/core" {
  interface Storage {
    commentThreadExtension: CommentThreadStorage;
  }
  interface Options {
    commentThreadExtension: CommentThreadOptions;
  }
}

export interface CommentThreadState {
  threads: Thread[];
  measuredThreads: MeasuredThread[];
  positionedThreads: PositionedThread[];
  selectedThreads: Thread[];
  selectedThread: Thread | null;
  threadId: string | null;
}

export const commentThreadPluginKey = new PluginKey("commentThreadPlugin");

export const CommentThreadExtension = Extension.create<
  CommentThreadOptions,
  CommentThreadStorage
>({
  name: "commentThreadExtension",

  addStorage() {
    return {
      draftId: null,
    };
  },

  addOptions() {
    return {
      threads: [],
      isLoading: false,
      onCreateThreadAsync: async () => {},
      onDeleteThreadAsync: async () => {},
      onResolveThreadAsync: async () => {},
      onUnresolveThreadAsync: async () => {},
      onAddCommentsAsync: async () => {},
      onRemoveCommentsAsync: async () => {},
      onUpdateCommentAsync: async () => {},
    };
  },

  addCommands() {
    return {
      draftThread() {
        return ({ editor }) => {
          draftThread(editor);
          return true;
        };
      },
      submitThread(content, pageId) {
        return ({ editor }) => {
          submitThread(editor, content, pageId);
          return true;
        };
      },
      removeThread(threadId) {
        return ({ editor }) => {
          if (!threadId) {
            const storedId = editor.storage.commentThreadExtension.draftId;
            if (!storedId) return false;
            removeThread(editor, storedId);
          } else {
            removeThread(editor, threadId);
          }

          return true;
        };
      },
      selectThread(threadId) {
        return ({ dispatch, tr }) => {
          if (dispatch) {
            dispatch(
              tr.setMeta(commentThreadPluginKey, {
                type: "selectThread",
                threadId,
              }),
            );
          }
          return true;
        };
      },
      unselectThread(threadId) {
        return ({ dispatch, tr }) => {
          if (dispatch) {
            dispatch(
              tr.setMeta(commentThreadPluginKey, {
                type: "unselectThread",
                threadId,
              }),
            );
          }
          return true;
        };
      },
      hoverThread(threadId) {
        return ({ dispatch, tr, editor }) => {
          if (dispatch) {
            if (!threadId) {
              const storedId = editor.storage.commentThreadExtension.draftId;
              dispatch(
                tr.setMeta(commentThreadPluginKey, {
                  type: "hoverThread",
                  storedId,
                }),
              );
            } else {
              dispatch(
                tr.setMeta(commentThreadPluginKey, {
                  type: "hoverThread",
                  threadId,
                }),
              );
            }
          }
          return true;
        };
      },
      hoverOffThread(threadId) {
        return ({ dispatch, tr }) => {
          if (dispatch) {
            dispatch(
              tr.setMeta(commentThreadPluginKey, {
                type: "unhoverThread",
                threadId,
              }),
            );
          }
          return true;
        };
      },
      resolveThread(threadId) {
        return ({ editor }) => {
          resolveThread(editor, threadId);

          return true;
        };
      },
      unresolveThread(threadId) {
        return ({ editor }) => {
          unresolveThread(editor, threadId);

          return true;
        };
      },
      addComment(threadId, authorId, text) {
        return ({ editor }) => {
          addComment(editor, threadId, authorId, text);
          return true;
        };
      },
      removeComment(threadId, commentId) {
        return ({ editor }) => {
          removeComment(editor, threadId, commentId);
          return true;
        };
      },
      updateComment(threadId, commentId, newText) {
        return ({ editor }) => {
          updateComment(editor, threadId, commentId, newText);

          return true;
        };
      },
      forceMeasure(threadId) {
        return ({ dispatch, tr }) => {
          if (dispatch) {
            dispatch(
              tr.setMeta(commentThreadPluginKey, {
                type: "forceMeasure",
                threadId,
              }),
            );
          }
          return true;
        };
      },
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const {
      threads: initialThreads,
      onCreateThreadAsync,
      onDeleteThreadAsync,
      onResolveThreadAsync,
      onUnresolveThreadAsync,
      onAddCommentsAsync,
      onRemoveCommentsAsync,
      onUpdateCommentAsync,
    } = this.options;

    return [
      new Plugin<CommentThreadState>({
        key: commentThreadPluginKey,

        state: {
          init: () => {
            return {
              threads: initialThreads ?? [],
              measuredThreads: [],
              positionedThreads: [],
              selectedThreads: [],
              selectedThread: null,
              threadId: null,
            };
          },

          apply(tr, next) {
            const meta = tr.getMeta(commentThreadPluginKey);
            if (!meta) return next;

            switch (meta.type) {
              case "initialThreads":
                {
                  next.threads = meta.providedThreads;
                }
                break;
              case "addComment":
                {
                  next.threads = next.threads.map((t) => {
                    if (t.id !== meta.threadId) return t;
                    return {
                      ...t,
                      comments: [
                        ...t.comments,
                        {
                          id: crypto.randomUUID(),
                          threadId: meta.threadId,
                          text: meta.text,
                          authorId: meta.authorId,
                          createdAt: Date.now(),
                        },
                      ],
                    };
                  });
                  const thread = next.threads.find(
                    (t) => t.id === meta.threadId,
                  );
                  if (thread) onAddCommentsAsync(thread, thread.comments);
                }
                break;

              case "removeComment":
                {
                  next.threads = next.threads.map((t) => {
                    if (t.id !== meta.threadId) return t;
                    return {
                      ...t,
                      comments: t.comments.filter(
                        (c) => c.id !== meta.commentId,
                      ),
                    };
                  });
                  const thread = next.threads.find(
                    (t) => t.id === meta.threadId,
                  );
                  if (thread) onRemoveCommentsAsync(thread);
                }
                break;

              case "updateComment":
                {
                  next.threads = next.threads.map((t) => {
                    if (t.id !== meta.threadId) return t;
                    return {
                      ...t,
                      comments: t.comments.map((comment) =>
                        comment.id === meta.commentId
                          ? { ...comment, text: meta.newText }
                          : comment,
                      ),
                    };
                  });
                  const thread = next.threads.find(
                    (t) => t.id === meta.threadId,
                  );
                  if (thread)
                    onUpdateCommentAsync({
                      thread,
                      commentId: meta.commentId,
                      newText: meta.newText,
                    });
                }
                break;

              case "removeThread":
                {
                  const thread = next.threads.find(
                    (t) => t.id === meta.threadId,
                  );
                  if (thread) onDeleteThreadAsync(thread);
                  next.threads = next.threads.filter(
                    (t) => t.id !== meta.threadId,
                  );
                }
                break;

              case "resolveThread":
                {
                  const thread = next.threads.find((t) => t.id === meta.t);
                  if (thread) onResolveThreadAsync(thread);
                  next.threads = next.threads.map((t) =>
                    t.id === meta.t ? { ...t, status: "resolved" } : t,
                  ) as Thread[];
                }
                break;

              case "unresolveThread":
                {
                  const thread = next.threads.find((t) => t.id === meta.t);
                  if (thread) onUnresolveThreadAsync(thread);
                  next.threads = next.threads.map((t) =>
                    t.id === meta.t ? { ...t, status: "open" } : t,
                  ) as Thread[];
                }
                break;

              case "submitThread":
                {
                  next.threads = next.threads.map((t) => {
                    if (t.id !== meta.threadId) return t;
                    return {
                      ...t,
                      status: "open",
                      pageId: meta.pageId,
                      content: meta.content,
                      comments: [
                        ...t.comments,
                        {
                          id: crypto.randomUUID(),
                          threadId: meta.threadId,
                          authorId: "You",
                          text: meta.content,
                          createdAt: Date.now(),
                        },
                      ],
                    };
                  });
                  editor.storage.commentThreadExtension.draftId = null;
                  const thread = next.threads.find(
                    (t) => t.id === meta.threadId,
                  );
                  if (thread) onCreateThreadAsync(thread);
                }
                break;
              case "draftThread":
                {
                  next.threads.push({
                    id: meta.threadId,
                    content: "",
                    anchor: { from: meta.from, to: meta.to },
                    status: "drafted",
                    comments: [],
                  });
                  editor.storage.commentThreadExtension.draftId = meta.threadId;
                }
                break;
              case "selectThread":
              case "forceMeasure":
                {
                  const selectedThread = next.threads.find(
                    (t) => t.id === meta.threadId,
                  );
                  if (selectedThread) {
                    next.selectedThread = selectedThread;
                  }
                }
                break;

              case "unselectThread":
                {
                  const selectedThread = next.threads.find(
                    (t) => t.id === meta.threadId,
                  );
                  if (selectedThread) {
                    next.selectedThread = null;
                  }
                  // next.selectedThreads = []
                  // next.selectedThread = null
                }
                break;

              case "hoverThread":
                {
                  const hoveredThread = next.threads.find(
                    (t) => t.id === meta.threadId,
                  );
                  if (hoveredThread) {
                    const alreadySelected = next.selectedThreads.some(
                      (t) => t.id === hoveredThread.id,
                    );
                    if (!alreadySelected) {
                      next.selectedThreads.push(hoveredThread);
                    }
                  }
                }
                break;

              case "unhoverThread":
                {
                  const newSelectedThreads = next.selectedThreads.filter(
                    (s) => s.id !== meta.threadId,
                  );
                  next.selectedThreads = newSelectedThreads;
                }
                break;
            }

            next.threads = mapThreads(tr, next.threads);

            next.measuredThreads = measureAllThreads(editor, next.threads);
            next.positionedThreads = resolveThreadCollisions(
              next.measuredThreads,
            );

            if (meta.type === "selectThread") {
              next.positionedThreads = resolveActiveThreadCollisions(
                next.measuredThreads,
                meta.threadId,
              );
            }

            return next;
          },
        },
        view() {
          return {
            update(view, prevState) {
              const state = view.state;

              // Only run if selection changed
              if (prevState.selection.eq(state.selection)) return;

              if (
                state.selection instanceof NodeSelection ||
                state.selection instanceof CellSelection
              )
                return;

              const pluginState = commentThreadPluginKey.getState(state);
              if (!pluginState) return;

              const { threads } = pluginState as CommentThreadState;
              const { from, to } = state.selection;

              // Find threads overlapping the selection
              const focusedThreads = threads.filter((thread) => {
                return thread.anchor.from <= to && thread.anchor.to >= from;
              });

              const tr = state.tr;

              if (focusedThreads.length > 0) {
                tr.setMeta(commentThreadPluginKey, {
                  type: "selectThread",
                  threadId: focusedThreads[0].id,
                });
                scrollToThread(focusedThreads[0].id);
              } else if (pluginState.selectedThread) {
                tr.setMeta(commentThreadPluginKey, {
                  type: "unselectThread",
                  threadId: pluginState.selectedThread.id,
                });
              }

              if (tr.docChanged || tr.getMeta(commentThreadPluginKey)) {
                view.dispatch(tr);
              }
            },
          };
        },
      }),

      new Plugin({
        key: new PluginKey("commentThreadDecorationPlugin"),

        state: {
          init: () => DecorationSet.empty,

          apply(tr, oldDecorations, _, newState) {
            const pluginState = commentThreadPluginKey.getState(newState);

            if (!pluginState) return oldDecorations.map(tr.mapping, tr.doc);

            const { selectedThreads, threads } =
              pluginState as CommentThreadState;

            const decorations: Decoration[] = [];

            for (const thread of threads) {
              const isSelected = selectedThreads.some(
                (t) => t.id === thread.id,
              );

              decorations.push(
                Decoration.inline(thread.anchor.from, thread.anchor.to, {
                  class: isSelected
                    ? "thread-anchor selected"
                    : "thread-anchor",
                  "data-thread-id": thread.id,
                }),
              );
            }

            return DecorationSet.create(newState.doc, decorations);
          },
        },

        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
