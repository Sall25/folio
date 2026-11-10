import { useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { Placeholder } from "@tiptap/extensions";
import { SHOWCASE_EXTENSIONS } from "src/features/showcase/showcase-extensions";
import { SlashCommand } from "src/components/tiptap-ui/slash-menu";
import { getSlashCommands } from "src/components/tiptap-ui/slash-menu/slash-commands";
import { ImageUploadNode } from "src/components/tiptap-node/image-upload-node/image-upload-node-extension";
import {
  VideoExtension,
  YoutubeExtension,
} from "src/components/tiptap-node/video-node";
import { AudioExtension } from "src/components/tiptap-node/audio-node";
import { FileNode } from "src/components/tiptap-node/file-node";
import { BookmarkNode } from "src/components/tiptap-node/bookmark-node/bookmark-node-extension";
import { handleImageUpload, MAX_FILE_SIZE } from "src/lib/tiptap-utils";
import i18n from "src/i18n/config";
import { descriptionDoc } from "./form-description-doc";
import "src/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "src/components/tiptap-node/code-block-node/code-block-node.scss";
import "src/components/tiptap-node/list-node/list-node.scss";
import "src/components/tiptap-node/image-node/image-node.scss";
import "src/components/tiptap-node/heading-node/heading-node.scss";
import "src/components/tiptap-node/paragraph-node/paragraph-node.scss";

// A form's description: a small rich editor (text, lists, callouts,
// tables, images, videos, files, links…) in the builder, the same document
// read-only on the fill page. Kept in the view as JSON (formDescription);
// an older plain-text description still shows.

/** Slash items the description can run: the showcase's blocks plus media. */
const SLASH_IDS = new Set([
  "style",
  "p",
  "h1",
  "h2",
  "h3",
  "styleDivider",
  "bulletList",
  "orderedList",
  "taskList",
  "insert",
  "separator",
  "quote",
  "codeBlock",
  "table",
  "column2",
  "column3",
  "tabs",
  "insertDivider",
  "mathBlock",
  "mathInline",
  "callout",
  "upload",
  "image",
  "file",
  "video",
  "audio",
  "bookmark",
]);
const isDescriptionItem = (c: { id: string }) =>
  SLASH_IDS.has(c.id) || c.id.startsWith("color-");

function makeExtensions(editable: boolean) {
  const media = [
    ImageUploadNode.configure({
      accept: "image/*",
      maxSize: MAX_FILE_SIZE,
      limit: 3,
      upload: handleImageUpload,
      onError: (error) => console.error("Upload failed:", error),
    }),
    FileNode.configure({
      upload: handleImageUpload,
      accept: "*/*",
      maxSize: 10 * 1024 * 1024,
      limit: 10,
    }),
    AudioExtension.configure({
      upload: handleImageUpload,
      maxSize: MAX_FILE_SIZE,
      onError: (error) => console.error("Upload failed:", error),
    }),
    YoutubeExtension,
    VideoExtension.configure({
      upload: handleImageUpload,
      maxSize: MAX_FILE_SIZE,
      onError: (error) => console.error("Upload failed:", error),
    }),
    BookmarkNode,
  ];
  if (!editable) return [...SHOWCASE_EXTENSIONS, ...media];
  return [
    ...SHOWCASE_EXTENSIONS,
    ...media,
    SlashCommand.configure({
      commands: getSlashCommands(i18n.t).filter(isDescriptionItem),
      filter: isDescriptionItem,
    }),
    Placeholder.configure({
      showOnlyCurrent: true,
      placeholder: () => i18n.t("database.form.descriptionPlaceholder"),
    }),
  ];
}

export function FormDescription({
  value,
  editable = false,
  onChange,
}: {
  value: JSONContent | string | null | undefined;
  editable?: boolean;
  /** The edited document, when it changes (debounced by the caller). */
  onChange?: (doc: JSONContent) => void;
}) {
  const extensions = useMemo(() => makeExtensions(editable), [editable]);
  const initial = useMemo(
    () => descriptionDoc(value) ?? { type: "doc", content: [{ type: "paragraph" }] },
    // Only the first value: the editor owns the document afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor(
    {
      extensions,
      content: initial,
      editable,
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: {
          class: "simple-editor form-description__doc",
          ...(editable ? {} : { "aria-readonly": "true" }),
        },
      },
      onUpdate: ({ editor: e }) => onChangeRef.current?.(e.getJSON()),
    },
    [extensions],
  );

  return (
    <EditorContent
      editor={editor}
      className={`simple-editor-content form-description${editable ? " form-description--editable" : ""}`}
    />
  );
}
