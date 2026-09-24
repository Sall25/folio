import { ReactLocation } from "@tanstack/react-location";
import { SimpleEditor } from "../components/tiptap-templates/simple/simple-editor";

export const location = new ReactLocation();

// Order matters: routes are matched top to bottom, and a shorter path like
// t/:teamspaceId also matches the start of longer ones. So every more
// specific /t/... route comes BEFORE the bare teamspace home.
export const routes = [
  {
    path: "t/:teamspaceId/page/:pageId",
    element: <SimpleEditor view="page" />,
  },
  {
    path: "t/:teamspaceId/chat/:roomId",
    element: <SimpleEditor view="chat" />,
  },
  {
    path: "t/:teamspaceId",
    element: <SimpleEditor view="home" />,
  },
  {
    path: "/",
    element: <SimpleEditor view="home" />,
  },
  {
    path: "/library/:tab",
    element: <SimpleEditor view="library" />,
  },
  {
    path: "/inbox",
    element: <SimpleEditor view="inbox" />,
  },
  {
    path: "/trash",
    element: <SimpleEditor view="trash" />,
  },
  {
    path: "page/:pageId",
    element: <SimpleEditor view="page" />,
  },
  // Workspace rooms and DMs opened outside a teamspace.
  {
    path: "chat/:roomId",
    element: <SimpleEditor view="chat" />,
  },
  { path: "resources", element: <SimpleEditor view="resources" /> },
];
