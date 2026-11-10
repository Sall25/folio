import { useCallback, useContext } from "react";
import { useTranslation } from "react-i18next";
import type { Page, PersonValue } from "src/types";
import { NotificationActionsContext } from "src/features/inbox/notification/notification-context";
import { useCurrentPerson } from "src/hooks/use-session";
import { addedPeople } from "../utils/assignee";

// People added to a row's person property hear of it: "Souleymane
// assigned you to a row", opening the row (like "Ask someone to look").
// Not you (you know), and only people newly added. Does nothing where
// there are no notifications (a template preview…).

export function useAssignNotifications() {
  const { t } = useTranslation();
  const actions = useContext(NotificationActionsContext);
  const { person: me } = useCurrentPerson();

  return useCallback(
    (
      row: Pick<Page, "id" | "title">,
      before: PersonValue[] | null | undefined,
      after: PersonValue[] | null | undefined,
    ) => {
      if (!actions) return;
      const title = row.title || t("rowMention.untitled");
      for (const person of addedPeople(before, after)) {
        if (person.id === me?.id) continue;
        actions.addNotification({
          type: "row-assign",
          recipientId: person.id,
          dedupKey: `row-assign:${row.id}:${person.id}:${Date.now()}`,
          title: t("database.assign.notifTitle", {
            who: me?.name || t("database.askToLook.someone"),
          }),
          message: title,
          sourcePageId: row.id,
          sourcePageTitle: title,
          mentionId: row.id,
          mentionLabel: title,
        });
      }
    },
    [actions, me, t],
  );
}
