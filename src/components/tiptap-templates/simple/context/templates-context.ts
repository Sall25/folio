import { createContext, useContext } from "react";

export type TemplatesContextType = {
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
};

export const TemplatesContext = createContext<TemplatesContextType>({
  open: false,
  onOpenChange() {},
});

export function useTemplates() {
  const ctx = useContext(TemplatesContext);
  return ctx;
}
