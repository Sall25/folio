import { Outlet, Router } from "@tanstack/react-location";
import { routes, location } from "./routes";
import { EditorLayoutProvider } from "../features/shell/context/editor-layout-provider";
import { ActivePageProvider } from "../features/pages/context/active-page-provider";
import { PageViewProvider } from "../features/pages/context/page-view-provider";
import { SearchProvider } from "../features/shell/search/search-provider";
import { LibraryProvider } from "../features/pages/library/library-provider";
import { TemplatesProvider } from "../features/pages/templates/templates-provider";
import { WorkspaceSettingsProvider } from "../features/workspace/context/workspace-settings-provider";
import { NotificationProvider } from "../features/inbox/notification";
import { PageCapabilitiesProvider } from "../features/pages/context/page-capabilities-provider";
import { ToastProvider } from "../features/shell/toast";
import { Sidebar } from "../features/shell/sidebar";
import { OfflineCacheGuard } from "../features/shell/offline/offline-cache-guard";
import { UpdatePrompt } from "../features/shell/offline/update-prompt";
import { OfflineDocSync } from "../features/shell/offline/offline-doc-sync";
import { ChatOutboxSync } from "../features/shell/offline/chat-outbox-sync";

// Everything a signed-in person needs: the app's providers, the router, the
// sidebar and the pages. Loaded lazily from App.tsx, only once someone is
// signed in, so the landing page and sign-in don't download the whole app.
export default function SignedInApp() {
  return (
    <OfflineCacheGuard>
      <EditorLayoutProvider>
        <SearchProvider>
          <TemplatesProvider>
            <PageViewProvider>
              <Router location={location} routes={routes}>
                <LibraryProvider>
                  <ActivePageProvider>
                    <WorkspaceSettingsProvider>
                      <PageCapabilitiesProvider>
                        <NotificationProvider>
                          <ToastProvider>
                            <UpdatePrompt />
                            <OfflineDocSync />
                            <ChatOutboxSync />
                            <Sidebar />
                            <Outlet />
                          </ToastProvider>
                        </NotificationProvider>
                      </PageCapabilitiesProvider>
                    </WorkspaceSettingsProvider>
                  </ActivePageProvider>
                </LibraryProvider>
              </Router>
            </PageViewProvider>
          </TemplatesProvider>
        </SearchProvider>
      </EditorLayoutProvider>
    </OfflineCacheGuard>
  );
}