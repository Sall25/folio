import { useTranslation } from "react-i18next";
import { MaterialIcon } from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import { usePageTab } from "./page-tab-store";
import { useChatThreads } from "./use-chat-threads";
import "./page-chat.scss";

// Page · Chat: the open page's document, or its comment threads as one chat
// (page-chat-view.tsx). A small floating switch at the bottom right of the
// page (off the top bar, which has little room); names in the app's
// tooltip, the open tab in the accent colour, the number of open threads on
// the chat tab. Mounted with the page (page-editor-layout.tsx).
export function PageChatSwitch() {
  const { t } = useTranslation();
  const { activePageId } = useOptionalActivePage();
  const { tab, setTab } = usePageTab(activePageId);
  const openCount = useChatThreads(activePageId).filter(
    (th) => th.status !== "resolved",
  ).length;
  if (!activePageId) return null;

  return (
    <div
      className="page-chat-switch"
      role="tablist"
      aria-label={t("pageChat.switch")}
    >
      <Button
        variant="ghost"
        role="tab"
        aria-selected={tab === "page"}
        aria-label={t("pageChat.page")}
        tooltip={t("pageChat.page")}
        className="page-chat-switch__tab"
        onClick={() => setTab("page")}
      >
        <MaterialIcon name="article" size={18} className="tiptap-button-icon" />
      </Button>
      <Button
        variant="ghost"
        role="tab"
        aria-selected={tab === "chat"}
        aria-label={t("pageChat.chat")}
        tooltip={t("pageChat.chat")}
        className="page-chat-switch__tab"
        onClick={() => setTab("chat")}
      >
        <MaterialIcon name="forum" size={18} className="tiptap-button-icon" />
        {openCount > 0 && (
          <span className="page-chat-switch__count">{openCount}</span>
        )}
      </Button>
    </div>
  );
}
