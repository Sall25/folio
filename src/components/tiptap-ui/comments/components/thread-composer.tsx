import { useCallback, useState, type FormEvent } from "react";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { useCreateComment } from "src/hooks/use-create-comment";
import { useCurrentPerson } from "src/hooks/use-session";
import { makeComment } from "src/utils/make-comment";

interface ThreadComposerProps {
  threadId: string;
}

export const ThreadComposer = ({ threadId }: ThreadComposerProps) => {
  const [comment, setComment] = useState("");
  const { person } = useCurrentPerson();
  const createComment = useCreateComment();

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();

      if (!comment || !person) {
        return;
      }
      const newComment = makeComment({
        threadId,
        text: comment,
        authorId: person.id,
      });
      createComment.mutate({ comment: newComment, threadId });

      setComment("");
    },
    [comment, threadId, createComment, person],
  );

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        placeholder="Reply to thread..."
        onChange={(e) => setComment(e.currentTarget.value)}
        value={comment}
        // onFocus={handleFocus}
      />
      <div className="flex-row">
        <ButtonGroup>
          <Button
            type="submit"
            className="primary"
            disabled={!comment.length}
            style={{
              color: "var(--tt-brand-color-500)",
            }}
          >
            Send
          </Button>
        </ButtonGroup>
      </div>
    </form>
  );
};
