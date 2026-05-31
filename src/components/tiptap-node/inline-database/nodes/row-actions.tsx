import { GripVertical, Trash2, Copy } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";

export function RowActions({
  onDelete,
  onDuplicate,
}: {
  onDelete: () => void;
  onDuplicate?: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="db-row__handle"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }} // don't select the database node
        >
          <GripVertical size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent onMouseDown={(e) => e.preventDefault()}>
        <Card style={{ minWidth: 160 }}>
          <CardItemGroup style={{ padding: "0 5px", width: "100%" }}>
            {onDuplicate && (
              <Button
                variant="ghost"
                style={{ width: "100%", justifyContent: "flex-start" }}
                onClick={onDuplicate}
              >
                <Copy className="tiptap-button-icon" size={14} />
                <span className="tiptap-button-text">Duplicate</span>
              </Button>
            )}
            <Button
              variant="ghost"
              style={{ width: "100%", justifyContent: "flex-start" }}
              onClick={onDelete}
            >
              <Trash2 className="tiptap-button-icon" size={14} />
              <span className="tiptap-button-text">Delete</span>
            </Button>
          </CardItemGroup>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
