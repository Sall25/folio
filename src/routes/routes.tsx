import { ReactLocation } from "@tanstack/react-location";
import { SimpleEditor } from "../components/tiptap-templates/simple/simple-editor";

export const location = new ReactLocation();

export const routes = [
  {
    path: "/",
    element: <SimpleEditor view="home" />,
  },
  {
    path: "/library/:tab",
    element: <SimpleEditor view="library" />,
  },
  {
    path: "page/:pageId",
    element: <SimpleEditor view="page" />,
  },
  { path: "resources", element: <SimpleEditor view="resources" /> },
];
