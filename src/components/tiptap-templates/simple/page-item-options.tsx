import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Ellipsis, Plus, PencilIcon, Trash2 } from "lucide-react";
import type { Page } from "src/types";
import { useActivePage } from "./context/active-page-context";
import { useCreatePage } from "src/hooks/use-create-page";
import { useRecentPages } from "src/hooks/use-pages";
import { makeChildPage } from "src/utils/make-page";
import { usePageCapabilities } from "src/hooks/use-page-role";
import { useTrashPage } from "src/hooks/use-trash-page";
import { useState } from "react";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";

interface PageItemOptionsProps {
  page: Page;
  onRenameAsync: () => Promise<void>;
  onOpenChange: (v: boolean) => void;
  shouldShow: boolean;
}

export function PageItemOptions({
  page,
  onRenameAsync,
  onOpenChange,
  shouldShow,
}: PageItemOptionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { setActivePageId, activePageId } = useActivePage();
  const createPage = useCreatePage();

  const { canDeletePage } = usePageCapabilities(activePageId);

  const { data: recentPages } = useRecentPages();

  const { mutate: trashPage } = useTrashPage();
  const { workspaceId } = useCurrentWorkspace();

  const handleDeletePage = () => {
    // Deleting the page we're on: navigate away FIRST so the editor never
    // lingers on the doomed page, then fire the mutation.
    if (page.id === activePageId) {
      const fallback = recentPages?.find((p) => p.id !== page.id);
      if (fallback) {
        setActivePageId(fallback.id);
      }
    }
    if (!workspaceId) return;
    trashPage({ pageId: page.id, workspaceId });
  };

  if (!canDeletePage) return null;

  if (!menuOpen) {
    return (
      <Button
        variant="ghost"
        className="page-options-btn"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(true);
        }}
        tooltip={"Options"}
      >
        <Ellipsis size={14} className="tiptap-button-icon" />
      </Button>
    );
  }

  return (
    <>
      <Popover
        open
        onOpenChange={(v) => {
          setMenuOpen(v);
          onOpenChange(v);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="page-options-btn"
            style={{ opacity: shouldShow ? 1 : 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Ellipsis size={14} className="tiptap-button-icon" />
          </Button>
        </PopoverTrigger>
        <PopoverContent style={{ zIndex: 9555 }}>
          <Card style={{ padding: "5px" }} className="page-item-options-card">
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
                <span className="tiptap-button-text">Rename</span>
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
                <span className="tiptap-button-text">Add page</span>
              </Button>

              <Button
                variant="ghost"
                style={{
                  width: "100%",
                  justifyContent: "flex-start",
                  gap: 10,
                }}
                className="tiptap-button-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePage();
                  onOpenChange(false);
                }}
              >
                <Trash2 className="tiptap-button-icon" />
                <span className="tiptap-button-text">Delete page</span>
              </Button>
            </ButtonGroup>
          </Card>
        </PopoverContent>
      </Popover>
    </>
  );
}
