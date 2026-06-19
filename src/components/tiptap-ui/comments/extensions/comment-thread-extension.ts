import { Extension } from "@tiptap/core";
import type { Thread } from "src/types";
import { Plugin, PluginKey, NodeSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { scrollToThread } from "./utils/scrollToThread";

export interface CommentThreadState {
  selectedThread: Thread | null;
  hoveredThread: Thread | null;
  threads: Thread[];
}

type CommentThreadMeta =
  | { type: "setThreads"; threads: Thread[] }
  | { type: "selectThread"; threadId: string }
  | { type: "unselectThread"; threadId: string }
  | { type: "hoverThread"; threadId: string | null }
  | { type: "scroll" };

export const commentThreadPluginKey = new PluginKey<CommentThreadState>(
  "commentThreadPlugin",
);

export const CommentThreadExtension = Extension.create({
  name: "commentThreadExtension",

  addProseMirrorPlugins() {
    return [
      // State plugin: owns threads + selection/hover, keeps anchors aligned.
      new Plugin<CommentThreadState>({
        key: commentThreadPluginKey,

        state: {
          init: (): CommentThreadState => ({
            threads: [],
            selectedThread: null,
            hoveredThread: null,
          }),

          apply(tr, value): CommentThreadState {
            // Keep live anchors aligned with edits to the document.
            let threads = value.threads;
            if (tr.docChanged) {
              threads = threads.map((thread) => ({
                ...thread,
                anchor: {
                  ...thread.anchor,
                  from: tr.mapping.map(thread.anchor.from),
                  to: tr.mapping.map(thread.anchor.to),
                },
              }));
            }

            const meta = tr.getMeta(commentThreadPluginKey) as
              | CommentThreadMeta
              | undefined;

            if (!meta) {
              return { ...value, threads };
            }

            switch (meta.type) {
              case "setThreads": {
                // Reconcile by id: keep the live (remapped) anchor for
                // threads we already have, take the incoming anchor only
                // for genuinely new threads.
                const byId = new Map(threads.map((t) => [t.id, t]));
                const next = meta.threads.map((incoming) => {
                  const existing = byId.get(incoming.id);
                  return existing
                    ? { ...incoming, anchor: existing.anchor }
                    : incoming;
                });
                return { ...value, threads: next };
              }

              case "selectThread": {
                const selectedThread =
                  threads.find((t) => t.id === meta.threadId) ?? null;
                return { ...value, threads, selectedThread };
              }

              case "unselectThread": {
                // Only clear if the cleared thread is the one selected.
                if (value.selectedThread?.id !== meta.threadId) {
                  return { ...value, threads };
                }
                return { ...value, threads, selectedThread: null };
              }

              case "hoverThread": {
                const hoveredThread =
                  meta.threadId === null
                    ? null
                    : (threads.find((t) => t.id === meta.threadId) ?? null);
                return { ...value, threads, hoveredThread };
              }

              case "scroll":
              default:
                return { ...value, threads };
            }
          },
        },

        view(editorView) {
          const container = document.querySelector(".simple-editor-main");
          let rafId: number | null = null;

          const onScroll = () => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
              editorView.dispatch(
                editorView.state.tr.setMeta(commentThreadPluginKey, {
                  type: "scroll",
                }),
              );
              rafId = null;
            });
          };

          container?.addEventListener("scroll", onScroll, { passive: true });

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

              const { threads } = pluginState;
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
            destroy() {
              container?.removeEventListener("scroll", onScroll);
              if (rafId !== null) cancelAnimationFrame(rafId);
            },
          };
        },
      }),

      // Decoration plugin: renders highlights from the state above.
      new Plugin({
        key: new PluginKey("commentThreadDecorationPlugin"),

        state: {
          init: () => DecorationSet.empty,

          apply(tr, oldDecorations, _, newState) {
            const pluginState = commentThreadPluginKey.getState(newState);

            if (!pluginState) return oldDecorations.map(tr.mapping, tr.doc);

            const { selectedThread, hoveredThread, threads } = pluginState;

            const decorations: Decoration[] = [];

            for (const thread of threads) {
              const isSelected = selectedThread?.id === thread.id;
              const isHovered = hoveredThread?.id === thread.id;

              decorations.push(
                Decoration.inline(thread.anchor.from, thread.anchor.to, {
                  class: `thread-anchor${isSelected ? " selected" : ""}${
                    isHovered ? " hovered" : ""
                  }`,
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
