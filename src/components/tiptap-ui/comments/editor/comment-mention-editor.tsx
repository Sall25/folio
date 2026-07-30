import { useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { forwardRef, useImperativeHandle } from "react";
import type { Editor, JSONContent } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import { usePeople } from "src/hooks/use-people";
import { createMentionSuggestion } from "./mention-suggestion";
import "./comment-mention-editor.scss";
import type { Person } from "src/types";

export interface CommentEditorRef {
  submit: () => void;
  clear: () => void;
}

// Minimal TipTap editor for composing/editing a comment with @-mentions.
// Outputs body as ProseMirror JSON. `initialContent` seeds it for EDIT mode so
// an existing comment shows as rich text (not raw JSON). Submit on Enter, via
// the ref's submit(), for a save button.
export const CommentMentionEditor = forwardRef<
  CommentEditorRef,
  {
    placeholder?: string;
    onSubmit: (json: JSONContent) => void;
    onEmptyChange?: (isEmpty: boolean) => void;
    autoFocus?: boolean;
    initialContent?: JSONContent | null;
  }
>(function CommentMentionEditor(
  {
    placeholder = "Add a comment…",
    onSubmit,
    onEmptyChange,
    autoFocus,
    initialContent,
  },
  ref,
) {
  const { data: people = [] } = usePeople();

  const peopleRef = useRef(people);
  useEffect(() => {
    peopleRef.current = people;
  }, [people]);

  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  const editor = useEditor({
    autofocus: autoFocus ? "end" : false,
    content: initialContent ?? undefined,
    extensions: [
      Document,
      Paragraph,
      Text,
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: { class: "comment-mention" },

        suggestion: createMentionSuggestion(
          // eslint-disable-next-line react-hooks/refs
          () => peopleRef.current as Person[],
        ),
      }),
    ],
    onUpdate: ({ editor }) => {
      onEmptyChange?.(editor.isEmpty);
    },
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          const ed = editorInstanceRef.current;
          if (ed && !ed.isEmpty) {
            onSubmitRef.current(ed.getJSON());
            ed.commands.clearContent();
          }
          return true;
        }
        return false;
      },
    },
  });

  const editorInstanceRef = useRef<Editor | null>(null);
  useEffect(() => {
    editorInstanceRef.current = editor;
  }, [editor]);

  useImperativeHandle(ref, () => ({
    submit: () => {
      const ed = editorInstanceRef.current;
      if (ed && !ed.isEmpty) {
        onSubmitRef.current(ed.getJSON());
      }
    },
    clear: () => editorInstanceRef.current?.commands.clearContent(),
  }));

  return <EditorContent editor={editor} className="comment-mention-editor" />;
});
