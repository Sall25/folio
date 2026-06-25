import { usePagesByCategory } from "./use-pages";

// A page template is just a page stored under the "Template" category.
// This is a thin lens over the existing category query — no new fetch.
export function useTemplates() {
  return usePagesByCategory("Template");
}
