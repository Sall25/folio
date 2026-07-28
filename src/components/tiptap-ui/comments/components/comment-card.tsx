import { AvatarDemo } from "src/components/tiptap-ui-primitive/avatar";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Edit, Ellipsis, Trash } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import "./comment-card.scss";

interface CommentCardProps {
  name: string;
  createdAt: number;
  deleted: boolean;
  content: string;
  onEdit: (content: string) => void;
  onDelete: () => void;
  showActions: boolean;
  showReply?: boolean;
  onReply?: () => void;
}
export const CommentCard = ({
  name,
  createdAt,
  deleted,
  content,
  onEdit,
  onDelete,
  showActions,
  showReply,
  onReply,
}: CommentCardProps) => {
  const [isComposing, setIsComposing] = useState(false);
  const [composeValue, setComposeValue] = useState(content);
  const [hovered, setHovered] = useState(false);

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
    <div
      className={commentWrapperClass.join(" ")}
      onMouseOver={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
        <div
          className="comment-content"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <p
            style={{
              marginLeft: "4px",
            }}
          >
            {content}
          </p>
          <Spacer orientation="horizontal" />
          {showActions && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  style={{
                    opacity: hovered ? 1 : 0,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  <Ellipsis className="tiptap-button-icon" />
                </Button>
              </PopoverTrigger>
              <PopoverPortal container={document.getElementById("root")}>
                <PopoverContent
                  style={{ zIndex: 9999 }}
                  align="center"
                  sideOffset={5}
                >
                  <Card
                    style={{
                      padding: "2px 5px",
                      borderRadius: "var(--tt-radius-sm)",
                    }}
                  >
                    <ButtonGroup orientation="vertical">
                      {showReply && (
                        <Button
                          type="button"
                          size="small"
                          variant="ghost"
                          className="page-comment__reply-trigger"
                          onClick={onReply}
                        >
                          <span className="tiptap-button-text"> Reply</span>
                        </Button>
                      )}
                      <Button
                        style={{ justifyContent: "flex-start" }}
                        variant="ghost"
                        size="small"
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
                          style={{
                            justifyContent: "flex-start",
                            minWidth: 100,
                          }}
                          size="small"
                          type="button"
                          variant="ghost"
                          onClick={(e) => {
                            console.log("delete button clicked");

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
                  </Card>
                </PopoverContent>
              </PopoverPortal>
            </Popover>
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
