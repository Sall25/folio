import { AvatarDemo } from "@/components/tiptap-ui-primitive/avatar";
import { Button, ButtonGroup } from "@/components/tiptap-ui-primitive/button";
import { Edit, Trash } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";

interface CommentCardProps {
  name: string;
  createdAt: number;
  deleted: boolean;
  content: string;
  onEdit: (content: string) => void;
  onDelete: () => void;
  showActions: boolean;
}
export const CommentCard = ({
  name,
  createdAt,
  deleted,
  content,
  onEdit,
  onDelete,
  showActions,
}: CommentCardProps) => {
  const [isComposing, setIsComposing] = useState(false);
  const [composeValue, setComposeValue] = useState(content);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();

      setIsComposing(false);

      onEdit(composeValue);
    },
    [composeValue, onEdit],
  );

  const commentWrapperClass: string[] = ["comment"];

  if (deleted) {
    commentWrapperClass.push("deleted");
  }

  return (
    <div className={commentWrapperClass.join(" ")}>
      <div className="profile-group">
        <AvatarDemo />
        <div className="label-group">
          <label>{name}</label>
          <label>{new Date(createdAt).toLocaleTimeString()}</label>
        </div>
      </div>

      {deleted && (
        <div className="comment-content">
          <p>Comment was deleted</p>
        </div>
      )}

      {!isComposing && !deleted && (
        <div className="comment-content">
          <p>{content}</p>
          {showActions && (
            <ButtonGroup orientation="horizontal">
              <Button
                className="edit-btn"
                variant="ghost"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  setIsComposing(true);
                }}
              >
                <Edit size={11} />
                <span>Edit</span>
              </Button>
              {onDelete && (
                <Button
                  className="delete-btn"
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    onDelete();
                  }}
                >
                  <Trash size={11} />
                  <span>Delete</span>
                </Button>
              )}
            </ButtonGroup>
          )}
        </div>
      )}

      {isComposing && !deleted && (
        <div className="comment-edit">
          <form onSubmit={handleSubmit}>
            <textarea
              onChange={(e) => setComposeValue(e.currentTarget.value)}
              value={composeValue}
            />
            <ButtonGroup orientation="horizontal">
              <Button
                //className="tiptap-button"
                variant="ghost"
                type="reset"
                onClick={() => setIsComposing(false)}
              >
                Cancel
              </Button>
              <Button
                variant="ghost"
                //  className="tiptap-button"
                type="submit"
                disabled={!composeValue.length || composeValue === content}
              >
                Accept
              </Button>
            </ButtonGroup>
          </form>
        </div>
      )}
    </div>
  );
};
