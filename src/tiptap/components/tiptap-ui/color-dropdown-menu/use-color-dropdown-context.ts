import { useContext } from "react";
import { ColorDropdownContext } from "./color-dropdown-context";

export function useColorDropdownContext() {
  const ctx = useContext(ColorDropdownContext)
  return ctx
}