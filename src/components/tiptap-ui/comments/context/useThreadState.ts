import { useContext } from "react";
import { ThreadContext } from "./threadContext";

export function useThreadState() {
  return useContext(ThreadContext);
}
