import { ReactLocation } from "@tanstack/react-location";
import { SimpleEditor } from "../components/tiptap-templates/simple/simple-editor";

export const location = new ReactLocation();

// Teamspace-space routes come first so /t/... is matched before anything
// more general. Entering a teamspace is purely a URL change: /t/:teamspaceId
// is the teamspace's home, /t/:teamspaceId/page/:pageId a page inside it.
export const routes = [
  {
    path: "t/:teamspaceId/page/:pageId",
    element: <SimpleEditor view="page" />,
  },
  {
    path: "t/:teamspaceId",
    element: <SimpleEditor view="home" />,
  },
  {
    path: "t/:teamspaceId/chat/:roomId",
    element: <SimpleEditor view="chat" />,
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
  { path: "resources", element: <SimpleEditor view="resources" /> },
];
