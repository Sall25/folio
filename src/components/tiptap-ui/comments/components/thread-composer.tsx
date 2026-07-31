import { useRef, useState } from "react";
import { Paperclip, AtSign, ArrowUp } from "lucide-react";
import { useCreateComment } from "src/hooks/use-create-comment";
import { useCurrentPerson } from "src/hooks/use-session";
import { makeComment } from "src/utils/make-comment";
import { CommentMentionEditor, type CommentEditorRef } from "../editor";
import type { JSONContent } from "@tiptap/core";
import "./thread-composer.scss";

interface ThreadComposerProps {
  threadId: string;
}

export const ThreadComposer = ({ threadId }: ThreadComposerProps) => {
  const { person } = useCurrentPerson();
  const createComment = useCreateComment();
  const editorRef = useRef<CommentEditorRef>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const submit = (json: JSONContent) => {
    if (!person) return;
    createComment.mutate({
      comment: makeComment({
        threadId,
        text: JSON.stringify(json),
        authorId: person.id,
      }),
      threadId,
    });
  };

  return (
    <div className="thread-composer">
      <div className="thread-composer__editor">
        <CommentMentionEditor
          ref={editorRef}
          placeholder="Reply…"
          onSubmit={submit}
          onEmptyChange={setIsEmpty}
        />
      </div>
      <div className="thread-composer__actions">
        <button
          type="button"
          className="thread-composer__icon-btn"
          title="Attach"
          disabled
        >
          <Paperclip size={16} />
        </button>
        <button
          type="button"
          className="thread-composer__icon-btn"
          title="Mention"
          // onClick={() => editorRef.current?.insertMentionTrigger?.()}
        >
          <AtSign size={16} />
        </button>
        <button
          type="button"
          className="thread-composer__send"
          disabled={isEmpty}
          onClick={() => editorRef.current?.submit()}
          title="Send"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  );
};
