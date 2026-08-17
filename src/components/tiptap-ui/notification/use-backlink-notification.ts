import { useEffect } from "react";
import { useNotificationActions } from "./notification-context";

export function useBacklinkNotification({
  pageId,
  sourcePageId,
  sourcePageTitle,
  nodeId,
}: {
  pageId: string | number;
  sourcePageId: string | number;
  sourcePageTitle: string;
  nodeId: string;
}) {
  const { addNotification, hasNotified, registerNotified } =
    useNotificationActions();

  useEffect(() => {
    const key = `backlink:${sourcePageId}→${pageId}`;
    if (hasNotified(key)) return;
    registerNotified(key);
    addNotification({
      type: "backlink",
      title: "New backlink",
      message: `"${sourcePageTitle}" linked to this page.`,
      sourcePageId,
      sourcePageTitle,
      targetNodeId: nodeId,
    });
  }, [pageId, sourcePageId]); // eslint-disable-line react-hooks/exhaustive-deps
}
