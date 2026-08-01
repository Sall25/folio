import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { TrashIcon } from "src/components/tiptap-icons";
import { Ellipsis, Plus, PencilIcon } from "lucide-react";
import type { Page } from "src/types";
import { useActivePage } from "./context/active-page-context";
import { useCreatePage } from "src/hooks/use-create-page";
import { useRecentPages } from "src/hooks/use-pages";
import { makeChildPage } from "src/utils/make-page";
import { trashPage } from "src/api/pages-trash";

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
  const { setActivePageId, activePageId } = useActivePage();
  const createPage = useCreatePage();

  const { data: recentPages } = useRecentPages();

  const handleDeletePage = () => {
    // Deleting the page we're on: navigate away FIRST so the editor never
    // lingers on the doomed page, then fire the mutation.
    if (page.id === activePageId) {
      const fallback = recentPages?.find((p) => p.id !== page.id);
      if (fallback) {
        setActivePageId(fallback.id);
      }
    }
    trashPage(page.id);
  };

  return (
    <>
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
          <Card style={{ padding: "5px" }}>
            <ButtonGroup
              style={{
                minWidth: 150,
                width: "100%",
                justifyContent: "flex-start",
              }}
              orientation="vertical"
            >
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
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenChange(false);
                  handleDeletePage();
                }}
              >
                <TrashIcon className="tiptap-button-icon" />
                <span>Delete page</span>
              </Button>
            </ButtonGroup>
          </Card>
        </PopoverContent>
      </Popover>
    </>
  );
}
