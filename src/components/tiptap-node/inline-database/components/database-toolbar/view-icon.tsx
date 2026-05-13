import { Button } from "src/components/tiptap-ui-primitive/button";
import type { DatabaseView } from "../../types/types";
import { Columns3, LayoutGrid, List, Table } from "lucide-react";

export function ViewIcon({ view }: { view: DatabaseView }) {
  return (
    <Button
      variant="ghost"
      style={{ background: "transparent", padding: 0, margin: 0 }}
    >
      {view.type === "table" && <Table className="tiptap-button-icon" />}
      {view.type === "list" && <List className="tiptap-button-icon" />}
      {view.type === "board" && <Columns3 className="tiptap-button-icon" />}
      {view.type === "gallery" && <LayoutGrid className="tiptap-button-icon" />}
    </Button>
  );
}
