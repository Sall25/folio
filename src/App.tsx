import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { routes, location } from "./routes";
import { Outlet, Router } from "@tanstack/react-location";
const client = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={client}>
      <Router location={location} routes={routes}>
        <Outlet />
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
