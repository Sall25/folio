import { SimpleEditor } from "src/components/tiptap-templates/simple/simple-editor";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
const client = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={client}>
      <div>
        <SimpleEditor />
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
