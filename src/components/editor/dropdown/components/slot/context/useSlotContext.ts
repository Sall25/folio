import { useContext } from "react";
import { SlotContext } from "./slotContext";

export default function useSlotContext() {
  const ctx = useContext(SlotContext);
  if (!ctx) {
    throw new Error('Slot item must be inside SlotContext.Provider');
  }
  return ctx;
}