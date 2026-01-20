import { createContext, useContext } from "react";

type DropdownContextType = {
  open: boolean;
  setOpen: (v: boolean) => void;
  scheduleClose: () => void;
  cancelClose: () => void;
}

export const DropdownContext = createContext<DropdownContextType | null>(null);

export function useDropdown() {
  const ctx = useContext(DropdownContext);
  if (!ctx) {
    throw new Error('Dropdown item mustbe inside <Dropdown />');
  }
  return ctx;
}
