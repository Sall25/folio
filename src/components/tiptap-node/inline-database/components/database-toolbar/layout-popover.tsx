import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { DatabaseAttrs, DatabaseView } from "../../types/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  ChevronRight,
  Columns3,
  LayoutGrid,
  LayoutTemplate,
  List,
  Table,
} from "lucide-react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Toggle } from "src/components/tiptap-ui-primitive/toggle";
import { type UseDatabaseReturn } from "../../hooks";
import { useCurrentEditor } from "@tiptap/react";

function ViewPallette({
  type,
  active,
  onSelect,
}: {
  type: DatabaseView["type"];
  active?: boolean;
  onSelect: (type: DatabaseView["type"]) => void;
}) {
  return (
    <CardItemGroup
      className={`items-center w-24 h-20 border m-1 cursor-pointer ${
        active ? "border-brand" : ""
      }`}
      onClick={() => onSelect(type)}
    >
      <CardItemGroup className="items-center w-16 h-16 text-brand">
        {type === "table" && <Table />}
        {type === "list" && <List />}
        {type === "board" && <Columns3 />}
        {type === "gallery" && <LayoutGrid />}
        <span className={`text-xs ${active ? "text-brand" : ""}`}>
          {type === "table" && "Table"}
          {type === "list" && "List"}
          {type === "board" && "Board"}
          {type === "gallery" && "Gallery"}
        </span>
      </CardItemGroup>
    </CardItemGroup>
  );
}

interface LayoutPopoverProps {
  view: DatabaseView;
  attrs: DatabaseAttrs;
  db: UseDatabaseReturn;
  showDbTitle?: boolean;
  showVLines?: boolean;
  wrapAllCols?: boolean;
  onToggleShowDbTitle?: () => void;
  onToggleShowVLines?: () => void;
  onToggleWrapAllCols?: () => void;
}

export function LayoutPopover({
  view,
  db,
  onToggleShowDbTitle,
  onToggleShowVLines,
  onToggleWrapAllCols,
  showDbTitle = true,
  showVLines = true,
  wrapAllCols = false,
}: LayoutPopoverProps) {
  const { editor } = useCurrentEditor();

  const onSelect = (type: DatabaseView["type"]) => {
    if (view.type === type) return;
    db.addView(type, type.charAt(0).toUpperCase() + type.slice(1));
  };

  if (!editor) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="w-full">
          <LayoutTemplate className="tiptap-button-icon" />
          <span className="tiptap-button-text">Layouts</span>
          <Spacer orientation="horizontal" />
          <span className="opacity-85" style={{ fontSize: 11 }}>
            {view.type.toUpperCase()}
          </span>
          <ChevronRight className="tiptap-button-icon-sub" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start">
        <Card className="w-64 p-4">
          <CardHeader>
            <CardGroupLabel>Layouts</CardGroupLabel>
          </CardHeader>
          <CardBody className="w-full justify-start mt-2">
            <CardItemGroup orientation="horizontal">
              <ViewPallette
                onSelect={onSelect}
                active={view.type === "table"}
                type="table"
              />
              <ViewPallette
                onSelect={onSelect}
                active={view.type === "list"}
                type="list"
              />
            </CardItemGroup>
            <CardItemGroup orientation="horizontal">
              <ViewPallette
                onSelect={onSelect}
                active={view.type === "board"}
                type="board"
              />
              <ViewPallette
                onSelect={onSelect}
                active={view.type === "gallery"}
                type="gallery"
              />
            </CardItemGroup>

            <Separator orientation="horizontal" />
            <CardItemGroup
              className="w-full justify-start"
              orientation="horizontal"
            >
              <span>Show database title</span>
              <Spacer orientation="horizontal" />
              <Toggle
                checked={showDbTitle}
                onChangeAsync={async () => onToggleShowDbTitle?.()}
              />
            </CardItemGroup>
            <CardItemGroup
              className="w-full justify-start"
              orientation="horizontal"
            >
              <span>Show vertical lines</span>
              <Spacer orientation="horizontal" />
              <Toggle
                checked={showVLines}
                onChangeAsync={async () => onToggleShowVLines?.()}
              />
            </CardItemGroup>
            <CardItemGroup
              className="w-full justify-start"
              orientation="horizontal"
            >
              <span>Wrap all columns</span>
              <Spacer orientation="horizontal" />
              <Toggle
                checked={wrapAllCols}
                onChangeAsync={async () => onToggleWrapAllCols?.()}
              />
            </CardItemGroup>
            <Separator orientation="horizontal" />
            <CardItemGroup>
              <Button variant="ghost">
                <span className="tiptap-button-text">Open pages in</span>
                <Spacer orientation="horizontal" />
                <span className="tiptap-button-text opacity-85">Side peek</span>
                <ChevronRight className="tiptap-button-icon-sub" />
              </Button>
              <CardItemGroup orientation="horizontal">
                <span>Show page icon</span>
                <Spacer />
                <Toggle checked={true} />
              </CardItemGroup>
            </CardItemGroup>
          </CardBody>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
