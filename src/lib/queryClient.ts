import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long fetched data counts as "fresh". Within this window, mounting
      // the same query again serves cache with NO network request. Set high so
      // you can SEE cache hits in the Devtools later.
      staleTime: 1000 * 30, // 30s

      // How long an INACTIVE query (no components using it) lingers in cache
      // before garbage collection. (Renamed from cacheTime in v5.)
      gcTime: 1000 * 60 * 5, // 5min

      retry: 1, // one automatic retry on failure
      refetchOnWindowFocus: false, // off for calmer learning — flip it on later to watch it fire
    },
  },
});
