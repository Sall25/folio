import { TocSidebar } from "src/components/tiptap-node/toc-node/toc-sidebar";
import { EditorProvider } from "../../editor/context/editor-provider";
import { memo } from "react";
import { TocProvider } from "src/components/tiptap-node/toc-node/toc-provider";
import { createPageMutationKey } from "src/hooks/use-create-page";
import { useIsMutating } from "@tanstack/react-query";
import { EditorContentSkeletonFull } from "../skeletons";
import { PageOverlays } from "./page-overlays";
import { SimpleEditorContent } from "../../editor/simple-editor-content";
import { MinePins, PinDropMenu, PinMirrors, PinsPane } from "../../editor/pins";
import {
  BackToChat,
  PageChatSwitch,
  PageChatView,
  usePageTab,
} from "src/features/comments/page-chat";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";

function PageEditorLayoutImpl() {
  // A page create is in flight (sidebar "+", or "add page to section").
  // Covers the window where activePageId hasn't moved yet (setActivePageId
  // only fires in .then()) as well as the moment right after it moves but
  // usePage(newId) hasn't resolved.
  const isCreatingPage =
    useIsMutating({
      mutationKey: createPageMutationKey,
      // A page made in place (a link from the slash menu) doesn't leave
      // this one: no skeleton over it.
      predicate: (m) => !m.options.meta?.quiet,
    }) > 0;
  // Page or Chat (the page's comment threads as one chat): on Chat the
  // editor stays mounted, hidden (page-chat.scss), so switching is instant.
  const { activePageId } = useOptionalActivePage();
  const { tab } = usePageTab(activePageId);

  return (
    <EditorProvider>
      <TocProvider>
        <div
          className="simple-editor-main"
          data-page-tab={tab}
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
          <PageChatView />
        </div>
        {tab === "page" && <TocSidebar topOffset={100} maxShowCount={20} />}
        <BackToChat />
        <PageChatSwitch />
        <PinsPane />
        <PinMirrors />
        <MinePins />
        <PinDropMenu />
      </TocProvider>
      <PageOverlays />
    </EditorProvider>
  );
}
export const PageEditorLayout = memo(PageEditorLayoutImpl);
