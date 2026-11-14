import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { createPageMutationOptions } from "./use-create-page";

// A row is a page, so it is created the way every other page is.
//
// This used to be a mutation of its own, and everything the sidebar's "New
// page" had been taught stopped at the database's edge. A row made here was
// not registered as created on this device, so opening it waited on the
// collab server instead of opening empty (use-collab-doc: isCreatedHere);
// it was not in the outbox, so one made offline was never sent; its
// mutation was held until the connection came back rather than running at
// once; and a failure put back a copy of the whole page list, taking out
// every page created while the request was in flight.
//
// `quiet`: adding a row doesn't take you off the page you are on, so the
// editor isn't covered while it saves (page-editor-layout.tsx).

/** useAddRow's options, apart from React, so the offline tests run the same
 *  ones the hook does (offline-page-writes.test.ts). */
export function addRowMutationOptions(qc: QueryClient) {
  return createPageMutationOptions(qc, { quiet: true });
}

export function useAddRow() {
  const qc = useQueryClient();
  return useMutation(addRowMutationOptions(qc));
}
