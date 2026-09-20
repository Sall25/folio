import { TocSidebar } from "src/components/tiptap-node/toc-node/toc-sidebar";
import { EditorProvider } from "../../context/editor-provider";
import { memo } from "react";
import { TocProvider } from "src/components/tiptap-node/toc-node/toc-provider";
import { createPageMutationKey } from "src/hooks/use-create-page";
import { useIsMutating } from "@tanstack/react-query";
import { EditorContentSkeletonFull } from "../skeletons";
import { PageOverlays } from "./page-overlays";
import { SimpleEditorContent } from "../../simple-editor-content";

function PageEditorLayoutImpl() {
  // A page create is in flight (sidebar "+", or "add page to section").
  // Covers the window where activePageId hasn't moved yet (setActivePageId
  // only fires in .then()) as well as the moment right after it moves but
  // usePage(newId) hasn't resolved.
  const isCreatingPage =
    useIsMutating({ mutationKey: createPageMutationKey }) > 0;

  return (
    <EditorProvider>
      <TocProvider>
        <div
          className="simple-editor-main"
          style={{
            transition: "margin-right 0.2s ease",
            // marginTop: isMobile ? "0px" : undefined,
          }}
        >
          {isCreatingPage && (
            <div className="editor-skeleton-overlay">
              <EditorContentSkeletonFull />
            </div>
          )}
          <SimpleEditorContent />
          <aside className="simple-editor-sidebar-right" />
        </div>
        <TocSidebar topOffset={100} maxShowCount={20} />
      </TocProvider>
      <PageOverlays />
    </EditorProvider>
  );
}
export const PageEditorLayout = memo(PageEditorLayoutImpl);
