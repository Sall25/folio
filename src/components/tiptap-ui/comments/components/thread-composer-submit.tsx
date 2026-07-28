import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import "./thread-composer-submit.scss";
import { ArrowUp } from "lucide-react";
import type { ID } from "src/types";
import { useCreateComment } from "src/hooks/use-create-comment";
import { makeComment } from "src/utils/make-comment";
import { usePatchThread } from "src/hooks/use-patch-thread";
import { patchThread } from "src/api/threads";
import { useCurrentPerson } from "src/hooks/use-session";

function SubmitBtn({ disabled = false }: { disabled?: boolean }) {
  return (
    <Button
      type="submit"
      data-state-active={!disabled ? "on" : "off"}
      disabled={disabled}
    >
      <ArrowUp className="tiptap-button-icon" />
    </Button>
  );
}

export function ThreadComposerSubmit({ threadId }: { threadId: ID }) {
  const [comment, setComment] = useState("");
  const threadIdRef = useRef(threadId);
  //  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const createComment = useCreateComment();
  const { person } = useCurrentPerson();
  const mutateThread = usePatchThread(({ id, patch }) =>
    patchThread(id, patch),
  );

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [comment]); // runs after every render caused by comment change

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!comment.trim() || !person) return;
      const newComment = makeComment({
        threadId: threadIdRef.current,
        text: comment,
        authorId: person.id,
      });
      createComment.mutate({
        comment: newComment,
        threadId: threadIdRef.current,
      });
      mutateThread.mutate({
        id: threadIdRef.current,
        patch: { status: "open" },
      });
      setComment("");

      if (textareaRef.current) textareaRef.current.style.height = "auto";
    },
    [comment, createComment, mutateThread, person],
  );

  return (
    <form onSubmit={handleSubmit} className="thread-submit-form">
      <textarea
        ref={textareaRef}
        rows={1}
        placeholder="Submit your thread..."
        onChange={(e) => {
          setComment(e.currentTarget.value);
        }}
        value={comment}
      />

      <SubmitBtn disabled={!comment.length} />

      {/* <div
        className="actions"
      >
        <Button
          variant="ghost"
          type="button"
          onClick={handleCancel}
          className="cancel-btn"
        >
          Cancel
        </Button>
        <Button
          className="submit-btn"
          variant="ghost"
          type="submit"
          disabled={!comment.length}
        >
          Submit
        </Button>

      </div> */}
    </form>
  );
}
