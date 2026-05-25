import { useState } from "react";
import { CreatePageContext } from "./create-page-context.js";

export function CreatePageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [createPageId, setCreatePageId] = useState<number | null>(null);

  return (
    <CreatePageContext.Provider value={{ createPageId, setCreatePageId }}>
      {children}
    </CreatePageContext.Provider>
  );
}
