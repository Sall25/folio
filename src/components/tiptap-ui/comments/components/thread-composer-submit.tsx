import { Button } from "src/components/tiptap-ui-primitive/button";
import { useRef, useState } from "react";
import "./thread-composer-submit.scss";
import { ArrowUp } from "lucide-react";
import type { ID } from "src/types";
import { useCreateComment } from "src/hooks/use-create-comment";
import { makeComment } from "src/utils/make-comment";
import { usePatchThread } from "src/hooks/use-patch-thread";
import { patchThread } from "src/api/threads";
import { useCurrentPerson } from "src/hooks/use-session";
import { CommentMentionEditor, type CommentEditorRef } from "../editor";
import type { JSONContent } from "@tiptap/core";
import { newId } from "src/lib/id";
import { extractMentionIds } from "src/utils/extract-mention-ids";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";
import { useNotifications } from "../../notification";

function SubmitBtn({
  disabled,
  onClick,
}: {
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      data-state-active={!disabled ? "on" : "off"}
      disabled={disabled}
    >
      <ArrowUp className="tiptap-button-icon" />
    </Button>
  );
}

export function ThreadComposerSubmit({ threadId }: { threadId: ID }) {
  const createComment = useCreateComment();
  const { person } = useCurrentPerson();
  const mutateThread = usePatchThread(({ id, patch }) =>
    patchThread(id, patch),
  );
  const [isEmpty, setIsEmpty] = useState(true);
  const editorRef = useRef<CommentEditorRef>(null);
  const { activePageId, activePage } = useActivePage();
  const { addNotification } = useNotifications();

  const handleSubmit = (json: JSONContent) => {
    if (!person || !activePageId) return;
    const commentId = newId();
    createComment.mutate({
      comment: makeComment({
        id: commentId,
        threadId,
        text: JSON.stringify(json),
        authorId: person.id,
      }),
      threadId,
    });
    // Notify each mentioned person (except yourself).
    // Notify each mentioned person (except yourself).
    const ids = extractMentionIds(json);

    ids.forEach((personId) => {
      if (personId === person.id) return;
      console.log("COMMENT notif recipient:", personId, "actor:", person.id);
      addNotification({
        type: "comment-mention",
        title: "Mentioned in a comment",
        message: `${person.name} mentioned you in a comment.`,
        recipientId: personId,
        dedupKey: `comment-mention:${commentId}:${personId}`,
        sourcePageId: activePageId,
        sourcePageTitle: activePage?.title,
        targetNodeId: threadId,
      });
    });
    mutateThread.mutate({ id: threadId, patch: { status: "open" } });
  };

  return (
    <div className="thread-submit-form">
      <CommentMentionEditor
        ref={editorRef}
        autoFocus
        placeholder="Reply…"
        onSubmit={handleSubmit}
        onEmptyChange={setIsEmpty}
      />
      <SubmitBtn
        disabled={isEmpty}
        onClick={() => editorRef.current?.submit()}
      />
    </div>
  );
}
