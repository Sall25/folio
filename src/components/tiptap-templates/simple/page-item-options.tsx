// page-item-options.tsx

import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Card, CardHeader } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { TrashIcon } from "src/components/tiptap-icons";
import { Ellipsis, Plus, PencilIcon } from "lucide-react";
import type { Page } from "./types";
import { PageItemIcon } from "./page-item-icon";

interface PageItemOptionsProps {
  page: Page;
  onDelete: (id: string) => void;
  onAddPage: (title: string, parentId: string) => void;
  onRename: () => void;
}

export function PageItemOptions({
  page,
  onDelete,
  onAddPage,
  onRename,
}: PageItemOptionsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="page-options-btn"
          onClick={(e) => e.stopPropagation()}
        >
          <Ellipsis size={14} className="tiptap-button-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverContent style={{ zIndex: 9555 }}>
        <Card style={{ padding: "0px 5px" }}>
          <CardHeader style={{ width: "100%" }}>
            <Button
              style={{ width: "100%", justifyContent: "flex-start", gap: 10 }}
              variant="ghost"
            >
              <PageItemIcon cover={page.cover} />
              <span>{page.title}</span>
            </Button>
          </CardHeader>
          <ButtonGroup style={{ minWidth: 150 }} orientation="vertical">
            <Button
              variant="ghost"
              style={{
                width: "100%",
                justifyContent: "flex-start",
                gap: 10,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onRename();
              }}
            >
              <PencilIcon className="tiptap-button-icon" />
              <span>Rename</span>
            </Button>

            <Button
              variant="ghost"
              style={{
                width: "100%",
                justifyContent: "flex-start",
                gap: 10,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onAddPage("Untitled", page.id);
              }}
            >
              <Plus className="tiptap-button-icon" />
              <span>Add page</span>
            </Button>

            <Button
              variant="ghost"
              style={{
                width: "100%",
                justifyContent: "flex-start",
                gap: 10,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(page.id);
              }}
            >
              <TrashIcon className="tiptap-button-icon" />
              <span>Delete page</span>
            </Button>
          </ButtonGroup>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
