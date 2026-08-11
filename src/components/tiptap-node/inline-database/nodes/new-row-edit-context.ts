import { createContext, useContext } from "react";
import type { ID } from "src/types";

interface NewRowEditContextValue {
  /** The just-created row whose title cell should auto-focus. */
  editingRecordId: ID | null;
  /** Delete an abandoned (empty-title) new row — page + record node. */
  cancelEmptyRecord: (recordId: ID) => void;
}

export const NewRowEditContext = createContext<NewRowEditContextValue>({
  editingRecordId: null,
  cancelEmptyRecord: () => {},
});
export const useNewRowEdit = () => useContext(NewRowEditContext);
