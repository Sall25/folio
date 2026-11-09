import { Extension } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import i18n from "src/i18n/config";
import { formatFileSize } from "src/components/tiptap-node/file-node/utils";
import "./file-drop-extension.scss";

// Drop files onto a page — from Explorer, Finder or the desktop — or paste
// one (a screenshot), and each becomes a block: an image, a video, an audio
// player, or a file block (other files dropped together share one).
//
// While a file uploads, a line where it will go says so, with its progress;
// the block takes its place once the file is uploaded (a page never holds a
// link that only works on this device). A file over the size limit shows
// why in that line for a few seconds instead.
//
// Drops inside a block that takes files itself (an upload card, a file
// block) are left to that block. Drags of blocks within the page aren't
// files and keep their normal behaviour. Ctrl/Cmd+Shift+V and pastes with
// rich content (a web page's HTML) keep the editor's normal paste.

export interface FileDropOptions {
  upload: (
    file: File,
    onProgress: (event: { progress: number }) => void,
    signal: AbortSignal,
  ) => Promise<string>;
  /** Largest image, video or audio file, in bytes. */
  maxSize: number;
  /** Largest other file, in bytes. */
  fileMaxSize: number;
  /** Most files in one file block. */
  fileLimit: number;
}

type Meta =
  | { add: { id: string; pos: number; text: string } }
  | { update: { id: string; text: string; error?: boolean } }
  | { remove: { id: string } };

export const fileDropPluginKey = new PluginKey<DecorationSet>("fileDrop");

const ERROR_MS = 6000;

/** Blocks that take dropped files themselves. */
const OWN_DROP_TARGETS =
  ".image-upload-card, .media-upload-card, .file-node, [data-file-drop-ignore]";

function placeholder(text: string, error = false): HTMLElement {
  const el = document.createElement("div");
  el.className = `file-drop-placeholder${error ? " is-error" : ""}`;
  el.contentEditable = "false";
  el.textContent = text;
  return el;
}

function findPlaceholder(state: EditorState, id: string): number | null {
  const set = fileDropPluginKey.getState(state);
  const found = set?.find(undefined, undefined, (spec) => spec.id === id);
  return found && found.length > 0 ? found[0].from : null;
}

/** Where blocks go for a position: after the paragraph (or heading…) it's
 *  in, or the position itself when it's already between blocks. */
function blockPos(state: EditorState, pos: number): number {
  const $pos = state.doc.resolve(Math.min(pos, state.doc.content.size));
  return $pos.parent.isTextblock && $pos.depth > 0 ? $pos.after() : pos;
}

const kindOf = (file: File) =>
  file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("audio/")
        ? "audio"
        : "file";

export const FileDrop = Extension.create<FileDropOptions>({
  name: "fileDrop",

  addOptions() {
    return {
      upload: async () => {
        throw new Error("No upload function configured");
      },
      maxSize: 25 * 1024 * 1024,
      fileMaxSize: 10 * 1024 * 1024,
      fileLimit: 10,
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const options = this.options;
    let plainTextPaste = false;
    let nextId = 0;

    const dispatch = (view: EditorView, meta: Meta) => {
      if (view.isDestroyed) return;
      view.dispatch(view.state.tr.setMeta(fileDropPluginKey, meta));
    };

    const showError = (view: EditorView, id: string, text: string) => {
      dispatch(view, { update: { id, text, error: true } });
      window.setTimeout(() => dispatch(view, { remove: { id } }), ERROR_MS);
    };

    // Uploads `files` (one block's worth) and puts the block where its line
    // is, or shows why it couldn't.
    const run = async (
      view: EditorView,
      pos: number,
      files: File[],
      kind: ReturnType<typeof kindOf>,
    ) => {
      const id = `file-drop-${++nextId}`;
      const label =
        files.length === 1
          ? files[0].name
          : i18n.t("fileDrop.files", { count: files.length });
      dispatch(view, {
        add: { id, pos, text: i18n.t("fileDrop.uploading", { name: label }) },
      });

      const limit = kind === "file" ? options.fileMaxSize : options.maxSize;
      const tooBig = files.find((f) => limit > 0 && f.size > limit);
      if (tooBig) {
        showError(
          view,
          id,
          i18n.t("fileDrop.tooBig", {
            name: tooBig.name,
            size: formatFileSize(tooBig.size),
            max: formatFileSize(limit),
          }),
        );
        return;
      }

      const shares = files.map(() => 0);
      const total = files.reduce((n, f) => n + f.size, 0) || 1;
      const controller = new AbortController();
      try {
        const urls = await Promise.all(
          files.map((file, i) =>
            options.upload(
              file,
              ({ progress }) => {
                shares[i] = (file.size * progress) / 100;
                const pct = Math.round(
                  (shares.reduce((a, b) => a + b, 0) / total) * 100,
                );
                dispatch(view, {
                  update: {
                    id,
                    text: i18n.t("fileDrop.uploadingPct", {
                      name: label,
                      pct,
                    }),
                  },
                });
              },
              controller.signal,
            ),
          ),
        );

        const at = findPlaceholder(view.state, id);
        dispatch(view, { remove: { id } });
        if (at === null || view.isDestroyed) return;

        let content: JSONContent;
        if (kind === "image") {
          content = { type: "image", attrs: { src: urls[0] } };
        } else if (kind === "video" || kind === "audio") {
          content = {
            type: kind,
            attrs: { src: urls[0], fileName: files[0].name },
          };
        } else {
          content = {
            type: "file",
            attrs: {
              files: files.map((f, i) => ({
                id: crypto.randomUUID(),
                name: f.name,
                url: urls[i],
                size: f.size,
                mimeType: f.type,
              })),
            },
          };
        }
        editor.chain().insertContentAt(at, content).run();
      } catch (error) {
        controller.abort();
        showError(
          view,
          id,
          i18n.t("fileDrop.failed", {
            name: label,
            reason: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    };

    // One block per image, video or audio file; the other files together
    // in file blocks of up to fileLimit.
    const addFiles = (view: EditorView, pos: number, files: File[]) => {
      const at = blockPos(view.state, pos);
      const others: File[] = [];
      for (const file of files) {
        const kind = kindOf(file);
        if (kind === "file") others.push(file);
        else void run(view, at, [file], kind);
      }
      for (let i = 0; i < others.length; i += options.fileLimit) {
        void run(view, at, others.slice(i, i + options.fileLimit), "file");
      }
    };

    return [
      new Plugin<DecorationSet>({
        key: fileDropPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            let next = set.map(tr.mapping, tr.doc);
            const meta = tr.getMeta(fileDropPluginKey) as Meta | undefined;
            if (!meta) return next;
            if ("add" in meta) {
              next = next.add(tr.doc, [
                Decoration.widget(meta.add.pos, placeholder(meta.add.text), {
                  id: meta.add.id,
                  side: -1,
                }),
              ]);
            } else {
              const id = "update" in meta ? meta.update.id : meta.remove.id;
              const found = next.find(
                undefined,
                undefined,
                (spec) => spec.id === id,
              );
              next = next.remove(found);
              if ("update" in meta && found.length > 0) {
                next = next.add(tr.doc, [
                  Decoration.widget(
                    found[0].from,
                    placeholder(meta.update.text, meta.update.error),
                    { id, side: -1 },
                  ),
                ]);
              }
            }
            return next;
          },
        },
        props: {
          decorations(state) {
            return fileDropPluginKey.getState(state);
          },
          handleKeyDown(_view, event) {
            plainTextPaste =
              (event.ctrlKey || event.metaKey) &&
              event.shiftKey &&
              event.key.toLowerCase() === "v";
            return false;
          },
          handleDrop(view, event, _slice, moved) {
            if (moved || !editor.isEditable) return false;
            const files = Array.from(event.dataTransfer?.files ?? []);
            if (files.length === 0) return false;
            const target = event.target as HTMLElement | null;
            if (target?.closest?.(OWN_DROP_TARGETS)) return false;
            const coords = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            event.preventDefault();
            addFiles(view, coords?.pos ?? view.state.selection.from, files);
            return true;
          },
          handlePaste(view, event) {
            const asPlain = plainTextPaste;
            plainTextPaste = false;
            if (asPlain || !editor.isEditable) return false;
            const data = event.clipboardData;
            const files = Array.from(data?.files ?? []);
            if (files.length === 0) return false;
            // A web page's content (an image with its text): the normal
            // paste keeps it as it was.
            if (data?.getData("text/html")) return false;
            const { $from } = view.state.selection;
            if ($from.parent.type.spec.code) return false;
            addFiles(view, view.state.selection.from, files);
            return true;
          },
        },
      }),
    ];
  },
});
