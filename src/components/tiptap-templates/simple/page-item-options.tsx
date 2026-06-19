import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Card, CardHeader } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { TrashIcon } from "src/components/tiptap-icons";
import { Ellipsis, Plus, PencilIcon } from "lucide-react";
import type { Page } from "src/types";
import { PageItemIcon } from "./page-item-icon";
import { useActivePage } from "./context/active-page-context";
import { useDeletePage } from "src/hooks/use-delete-page";
import { useCreatePage } from "src/hooks/use-create-page";
import { makeChildPage } from "src/utils/make-page";

interface PageItemOptionsProps {
  page: Page;
  onRenameAsync: () => Promise<void>;
  onOpenChange: (v: boolean) => void;
}

export function PageItemOptions({
  page,
  onRenameAsync,
  onOpenChange,
}: PageItemOptionsProps) {
  const { setActivePageId } = useActivePage();
  const createPage = useCreatePage();
  const deletePage = useDeletePage();

  return (
    <Popover onOpenChange={onOpenChange}>
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
              onClick={async (e) => {
                e.stopPropagation();
                await onRenameAsync();
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
              onClick={async (e) => {
                e.stopPropagation();
                const child = makeChildPage(page);
                createPage.mutate(child);
                setActivePageId(child.id);
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
              onClick={async (e) => {
                e.stopPropagation();
                deletePage.mutate(page.id);
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
