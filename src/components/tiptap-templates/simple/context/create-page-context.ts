import { createContext, useContext } from "react";

interface CreatePageContextValue {
  createPageId: number | null;
  setCreatePageId: (id: number | null) => void;
}

export const CreatePageContext = createContext<CreatePageContextValue>({
  createPageId: null,
  setCreatePageId: () => {},
});

export function useCreatePage() {
  return useContext(CreatePageContext);
}
