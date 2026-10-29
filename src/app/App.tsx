import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { lazy, Suspense } from "react";
import { AuthGate, GateLoading } from "../features/auth/auth-gate";
import {
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE,
  queryPersister,
  shouldPersistQuery,
} from "../lib/query-persistence";
import { createPageMutationKey } from "src/hooks/use-create-page";
import { createPage } from "src/api/pages";

// The signed-in app (providers, router, sidebar, pages) is its own chunk,
// downloaded only after sign-in; see signed-in-app.tsx.
const SignedInApp = lazy(() => import("./signed-in-app"));

// /p/<id>: a published page — public, for signed-in people and visitors
// alike, so it skips the sign-in gate and the signed-in app entirely.
const PublishedPage = lazy(() => import("../features/publish/published-page"));
const isPublishedPath = window.location.pathname.startsWith("/p/");

// gcTime must be at least the persisted maxAge, or restored queries would be
// garbage-collected (and dropped from disk) before anything uses them.
const client = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: QUERY_CACHE_MAX_AGE,
    },
  },
});
client.setMutationDefaults(createPageMutationKey, { mutationFn: createPage });

function App() {
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister: queryPersister,
        maxAge: QUERY_CACHE_MAX_AGE,
        buster: QUERY_CACHE_BUSTER,
        dehydrateOptions: {
          shouldDehydrateQuery: shouldPersistQuery,

          shouldDehydrateMutation: (m) =>
            m.state.isPaused && m.options.mutationKey?.[0] === "pages",
        },
      }}
      // Anything queued while restoring goes out once the cache is back.
      onSuccess={() => client.resumePausedMutations()}
    >
      {isPublishedPath ? (
        <Suspense fallback={<GateLoading />}>
          <PublishedPage />
        </Suspense>
      ) : (
        <AuthGate>
          <Suspense fallback={<GateLoading />}>
            <SignedInApp />
          </Suspense>
        </AuthGate>
      )}
    </PersistQueryClientProvider>
  );
}

export default App;
