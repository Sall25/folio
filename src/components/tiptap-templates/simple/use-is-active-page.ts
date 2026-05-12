import { useMemo } from "react";
import { useMatch } from "@tanstack/react-location";

export function useIsActivePage(pageId: number): boolean {
  const { params } = useMatch();
  return useMemo(
    () => (params.pageId ? Number(params.pageId) === pageId : false),
    [params.pageId, pageId],
  );
}
