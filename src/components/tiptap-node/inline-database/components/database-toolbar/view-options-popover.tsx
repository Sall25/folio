import { Columns3, Ellipsis, LayoutGrid, List, Table, X } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { TextareaAutosize } from "src/components/tiptap-ui-primitive/textarea-auto-size";
import type { DatabaseView } from "../../types/types";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import "./view-options-popover.scss";
import { LayoutPopover } from "./layout-popover";
import type { UseDatabaseReturn } from "../../hooks";

function ViewName({ name }: { name: string }) {
  return <CardGroupLabel>{name}</CardGroupLabel>;
}

function CloseButton({ onClose }: { onClose?: () => void }) {
  return (
    <Button variant="ghost" onClick={onClose}>
      <X className="tiptap-button-icon" />
    </Button>
  );
}

function ViewIcon({ view }: { view: DatabaseView }) {
  return (
    <Button variant="ghost">
      {view.type === "table" && <Table className="tiptap-button-icon" />}
      {view.type === "board" && <Columns3 className="tiptap-button-icon" />}
      {view.type === "list" && <List className="tiptap-button-icon" />}
      {view.type === "gallery" && <LayoutGrid className="tiptap-button-icon" />}
    </Button>
  );
}

function Row({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: Partial<CSSProperties>;
  className?: string;
}) {
  return (
    <CardItemGroup orientation="horizontal" className={className} style={style}>
      {children}
    </CardItemGroup>
  );
}

function Column({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: Partial<CSSProperties>;
  className?: string;
}) {
  return (
    <CardItemGroup style={style} className={className}>
      {children}
    </CardItemGroup>
  );
}

export function ViewOptionsPopover({
  view,
  db,
  open: providedOpen,
  onOpenChange,
}: {
  view: DatabaseView;
  open?: boolean;
  db: UseDatabaseReturn;
  onOpenChange?: (o: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const { name } = view;

  if (providedOpen)
    return (
      <Card
        className="w-82 py-4 px-6"
        style={{ position: "absolute", right: -180, top: 0, zIndex: 999 }}
      >
        <Column className="w-full justify-start">
          <Row className="w-full justify-start">
            <ViewName name={name} />
            <Spacer orientation="horizontal" />
            <CloseButton onClose={() => onOpenChange?.(false)} />
          </Row>
          <Row className="w-full justify-start">
            <ViewIcon view={view} />
            <TextareaAutosize />
          </Row>
          <Row>
            <LayoutPopover db={db} view={view} />
          </Row>
        </Column>
      </Card>
    );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost">
          <Ellipsis className="tiptap-button-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Card className="w-64 py-4 px-6">
          <Column className="w-full justify-start">
            <Row className="w-full justify-start">
              <ViewName name={name} />
              <Spacer orientation="horizontal" />
              {/* {providedOpen && (
                <CloseButton onClose={() => onOpenChange?.(false)} />
              )} */}
            </Row>
            <Row className="w-full justify-start">
              <ViewIcon view={view} />
              <TextareaAutosize />
            </Row>
            <Row>
              <LayoutPopover db={db} view={view} />
            </Row>
          </Column>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
