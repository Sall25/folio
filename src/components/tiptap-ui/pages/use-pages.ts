import { useContext } from "react";
import { PageContext } from "./page-context";

export function usePages() {
  const ctx = useContext(PageContext);
  if (!ctx) throw new Error("usePages must be used inside PageProvider");
  return ctx;
}
