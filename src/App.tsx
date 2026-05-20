import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { routes, location } from "./routes";
import { Outlet, Router } from "@tanstack/react-location";
import { EditorProvider } from "./components/tiptap-templates/simple/context/editor-provider";
import { EditorLayoutProvider } from "./components/tiptap-templates/simple/context/editor-layout-provider";
import { SimpleEditorSidebar } from "./components/tiptap-templates/simple/simple-editor-sidebar";
import { ActivePageProvider } from "./components/tiptap-templates/simple/context/active-page-provider";

const client = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={client}>
      <EditorLayoutProvider>
        <EditorProvider>
          <Router location={location} routes={routes}>
            <ActivePageProvider>
              <SimpleEditorSidebar />
              <Outlet />
            </ActivePageProvider>
          </Router>
        </EditorProvider>
      </EditorLayoutProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
