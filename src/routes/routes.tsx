import { ReactLocation } from "@tanstack/react-location";
import { SimpleEditor } from "../components/tiptap-templates/simple/simple-editor";

export const location = new ReactLocation();

export const routes = [
  {
    path: "/",
    element: <SimpleEditor />,
  },
  {
    path: "/page/:pageId",
    element: <SimpleEditor />,
  },
];
