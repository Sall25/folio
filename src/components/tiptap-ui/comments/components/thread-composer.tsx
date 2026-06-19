import { useCallback, useState, type FormEvent } from "react";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { useCreateComment } from "src/hooks/use-create-comment";
import { makeComment } from "src/utils/make-comment";

interface ThreadComposerProps {
  threadId: string;
}

export const ThreadComposer = ({ threadId }: ThreadComposerProps) => {
  const [comment, setComment] = useState("");
  const createComment = useCreateComment();

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();

      if (!comment) {
        return;
      }
      const newComment = makeComment({
        threadId,
        text: comment,
        authorId: "You",
      });
      createComment.mutate({ comment: newComment, threadId });

      setComment("");
    },
    [comment, threadId, createComment],
  );

  // const handleFocus = useCallback(() => {
  //   if (editor) {
  //     editor.commands.forceMeasure(threadId);
  //   }
  // }, [editor, threadId]);

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
