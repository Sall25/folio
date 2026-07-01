import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { routes, location } from "./routes";
import { Outlet, Router } from "@tanstack/react-location";
import { EditorProvider } from "./components/tiptap-templates/simple/context/editor-provider";
import { EditorLayoutProvider } from "./components/tiptap-templates/simple/context/editor-layout-provider";
import { SimpleEditorSidebar } from "./components/tiptap-templates/simple/simple-editor-sidebar";
import { ActivePageProvider } from "./components/tiptap-templates/simple/context/active-page-provider";
import { PageViewProvider } from "./components/tiptap-templates/simple/context/page-view-provider";
import { SearchProvider } from "./components/tiptap-templates/simple/context/search-provider";
import { LibraryProvider } from "./components/tiptap-templates/simple/context/library-provider";
import { TemplatesProvider } from "./components/tiptap-templates/simple/context/templates-provider";
import { WorkspaceSettingsProvider } from "./components/tiptap-templates/simple/context/workspace-settings-provider";

const client = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={client}>
      <EditorLayoutProvider>
        <SearchProvider>
          <TemplatesProvider>
            <PageViewProvider>
              <Router location={location} routes={routes}>
                <LibraryProvider>
                  <ActivePageProvider>
                    <WorkspaceSettingsProvider>
                      <EditorProvider>
                        <SimpleEditorSidebar />
                        <Outlet />
                      </EditorProvider>
                    </WorkspaceSettingsProvider>
                  </ActivePageProvider>
                </LibraryProvider>
              </Router>
            </PageViewProvider>
          </TemplatesProvider>
        </SearchProvider>
      </EditorLayoutProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
