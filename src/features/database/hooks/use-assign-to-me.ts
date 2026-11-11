import { useCallback } from "react";
import type {
  CellValue,
  DatabaseProperty,
  ID,
  Page,
  PersonValue,
} from "src/types";
import { useCurrentPerson } from "src/hooks/use-session";
import { assigneeProperty, withAssignee } from "../utils/assignee";

/** "Assign to me" for a row: a handler that adds you to the database's
 *  assignee property (replacing the assignee when it takes one person), or
 *  undefined when there's no person property or you're already on it. For
 *  card controls and row menus. */
export function useAssignToMe(
  properties: DatabaseProperty[],
  setValue: (recordId: ID, propertyId: ID, value: CellValue | null) => void,
) {
  const { person } = useCurrentPerson();
  return useCallback(
    (record: Page): (() => void) | undefined => {
      const prop = assigneeProperty(properties);
      if (!prop || !person || prop.config.type !== "person") return undefined;
      const me: PersonValue = {
        id: person.id,
        name: person.name,
        avatarUrl: person.avatarUrl ?? undefined,
      };
      const next = withAssignee(
        record.values?.[prop.id] as PersonValue[] | undefined,
        me,
        prop.config.limit === "single",
      );
      if (!next) return undefined;
      return () => setValue(record.id, prop.id, next);
    },
    [properties, person, setValue],
  );
}
