import { createContext } from "react";
import { type Page, type CreatePagePayload } from "src/services/page-service";

interface PageContextValue {
  pages: Page[];
  loading: boolean;
  error: string | null;
  createPage: (payload?: CreatePagePayload) => Promise<Page>;
  updatePage: (id: string, payload: Partial<Page>) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  refreshPages: () => Promise<void>;
}

export const PageContext = createContext<PageContextValue | null>(null);
