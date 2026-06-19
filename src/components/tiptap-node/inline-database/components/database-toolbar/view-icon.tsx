import type { DatabaseView } from "src/types";
import {
  Calendar,
  ChartBar,
  Columns3,
  LayoutGrid,
  List,
  Table,
} from "lucide-react";

export function ViewIcon({ view }: { view: DatabaseView }) {
  return (
    <>
      {view.type === "table" && <Table className="tiptap-button-icon" />}
      {view.type === "list" && <List className="tiptap-button-icon" />}
      {view.type === "board" && <Columns3 className="tiptap-button-icon" />}
      {view.type === "gallery" && <LayoutGrid className="tiptap-button-icon" />}
      {view.type === "calendar" && <Calendar className="tiptap-button-icon" />}
      {view.type === "timeline" && <ChartBar className="tiptap-button-icon" />}
    </>
  );
}
