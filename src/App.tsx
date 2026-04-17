import { SimpleEditor } from "src/components/tiptap-templates/simple/simple-editor";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const client = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={client}>
      <div>
        <SimpleEditor />
      </div>
    </QueryClientProvider>
  );
}

export default App;
