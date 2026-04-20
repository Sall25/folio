import { Button } from "src/components/tiptap-ui-primitive/button";
import type { Editor } from "@tiptap/core";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import "./thread-composer-submit.scss";
import { ArrowUp } from "lucide-react";

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

export function ThreadComposerSubmit({
  editor,
  // threadId,
  pageId,
}: {
  editor: Editor | null;
  threadId: string;
  pageId: string;
}) {
  const [comment, setComment] = useState("");
  //  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [comment]); // runs after every render caused by comment change

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!comment.trim() || !editor) return;
      console.log("thread submit pageId", pageId);
      editor.commands.submitThread(comment, pageId);
      setComment("");
      //    setFocused(false);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    },
    [editor, comment, pageId],
  );

  // if (!editor) return null

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
