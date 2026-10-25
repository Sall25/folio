"use client";

// --- Styles ---
import "src/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "src/components/tiptap-node/code-block-node/code-block-node.scss";
import "src/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "src/components/tiptap-node/list-node/list-node.scss";
import "src/components/tiptap-node/image-node/image-node.scss";
import "src/components/tiptap-node/heading-node/heading-node.scss";
import "src/components/tiptap-node/paragraph-node/paragraph-node.scss";
import "src/features/shell/simple-editor.scss";
import "src/features/editor/toc.scss";
import "src/features/pages/page-create-modal.scss";
import type { View } from "src/types";
import { usePageBrowserTab } from "./hooks/use-page-browser-tab";
import { HomePage, LibraryPage, PageEditorLayout } from "./views";
import { AppOverlays } from "./app-overlays";
import { SimpleEditorToolbar } from "./simple-editor-toolbar";
import { InboxPage } from "../inbox/inbox-page";
import { TrashPage } from "../pages/trash/trash-page";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useApplyTheme } from "src/hooks/use-apply-theme";
import { useApplyLanguage } from "src/hooks/use-apply-language";
import { ChatRoomView } from "../chat/chat-room-view";
import { ShortcutSheet } from "src/components/tiptap-ui/shortcut-sheet";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-location";
import { useTranslation } from "react-i18next";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { useTeamspaces } from "src/hooks/use-teamspaces";
import { useToast } from "./toast";
import { useApplyIconStyle } from "src/components/icons";

// A /t/:id address for a teamspace you're not in any more (you left, were
// removed, or it was deleted) → back to the workspace instead of an empty
// screen.
function useLeaveMissingTeamspace() {
  const space = useCurrentSpace();
  const { isSuccess: teamspacesLoaded } = useTeamspaces();
  const navigate = useNavigate();
  const { show } = useToast();
  const { t } = useTranslation();
  const missing =
    space.kind === "teamspace" && teamspacesLoaded && !space.teamspace;

  useEffect(() => {
    if (!missing) return;
    navigate({ to: "/", replace: true });
    show(t("teamspaces.noLongerAvailable"), "info");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing]);
}

function SimpleEditorMain({ view }: { view: View }) {
  return (
    <>
      {view === "home" && <HomePage />}

      {view === "library" && <LibraryPage />}

      {view === "page" && <PageEditorLayout />}

      {view === "inbox" && <InboxPage />}

      {view === "trash" && <TrashPage />}

      {view === "chat" && <ChatRoomView />}

      <AppOverlays />
    </>
  );
}

export function SimpleEditor({ view }: { view: View }) {
  const capitalized = view.charAt(0).toUpperCase() + view.slice(1);
  // On a page the tab shows the page's own title and icon; other views
  // (inbox, trash, chat…) show their name and the Folio icon.
  usePageBrowserTab("Folio", view === "page" ? undefined : capitalized);
  useLeaveMissingTeamspace();
  const { workspace } = useCurrentWorkspace();

  // Theme and language are both per-workspace: applied straight from
  // workspace.settings, re-applied whenever the current workspace changes
  // (i.e. on switch). No per-person localStorage override anymore — that was
  // what made theme follow the person across workspaces.
  useApplyTheme(workspace?.settings.defaultTheme ?? "system");
  useApplyIconStyle();
  useApplyLanguage(workspace?.settings.language);

  return (
    <div className="simple-editor-wrapper">
      <SimpleEditorToolbar view={view} rectY={0} />
      <SimpleEditorMain view={view} />
      <ShortcutSheet />
    </div>
  );
}
