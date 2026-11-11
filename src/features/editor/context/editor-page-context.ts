import { createContext, useContext } from "react";

/** The page an editor shows, for blocks that keep data by page (question
 *  answers). Each editor (the page, a peek, a centred page) provides its own. */
export const EditorPageContext = createContext<string | null>(null);
export const useEditorPageId = () => useContext(EditorPageContext);
