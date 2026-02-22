import { Editor } from "@tiptap/react";
import { StyleContext } from "../context/styleContext";
import { type ReactNode, type RefObject } from "react";

export function StyleBase({ editor, shouldShow, setShouldShow, shouldShowRef, children }:
  {
    editor: Editor,
    shouldShow?: boolean,
    shouldShowRef?: RefObject<boolean | null>,
    setShouldShow?: (b: boolean) => void,
    children: ReactNode
  }) {

  return (
    <StyleContext.Provider value={{ editor, shouldShow, setShouldShow: setShouldShow, shouldShowRef }}>
      {children}
    </StyleContext.Provider>
  );
}