import { createContext, useContext } from "react";
import type { ID } from "src/types";

interface NewRowEditStateContextValue {
  editingRecordId: ID | null;
}

interface NewRowEditActionsContextValue {
  /** Delete an abandoned (empty-title) new row — page + record node. */
  cancelEmptyRecord: (recordId: ID) => void;
}

export const NewRowEditStateContext =
  createContext<NewRowEditStateContextValue>({
    editingRecordId: null,
  });

export const NewRowEditActionsContext =
  createContext<NewRowEditActionsContextValue>({
    cancelEmptyRecord: () => {},
  });

export const useNewRowEditState = () => useContext(NewRowEditStateContext);

export const useNewRowEditActions = () => useContext(NewRowEditActionsContext);

export const useNewRowEdit = () => ({
  ...useNewRowEditState(),
  ...useNewRowEditActions(),
});
