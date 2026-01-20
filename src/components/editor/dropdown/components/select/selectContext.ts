import { createContext, useContext } from "react";

type SelectContextType = {
  open: boolean;
  setOpen: (v: boolean) => void;
  scheduleClose: () => void;
  cancelClose: () => void;
}

export const SelectContext = createContext<SelectContextType | null>(null);

export function useSelect() {
  const ctx = useContext(SelectContext);
  if (!ctx) {
    throw new Error('Option must be inside <Select />');
  }
  return ctx;
}