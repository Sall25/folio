import {
  ArrowUpDown,
  Bell,
  Calendar,
  ChevronRight,
  Columns3,
  Copy,
  Ellipsis,
  Filter,
  GanttChart,
  Group,
  LayoutGrid,
  Link as LinkIcon,
  List,
  ListTree,
  Lock,
  SlidersHorizontal,
  Table,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { TextareaAutosize } from "src/components/tiptap-ui-primitive/textarea-auto-size";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import type { DatabaseView } from "../../types/types";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import "./view-options-popover.scss";
import type { UseDatabaseReturn } from "../../hooks";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { LayoutPopover } from "./layout-popover";

type LucideIcon = ComponentType<{ className?: string; size?: number }>;

function layoutMeta(type: DatabaseView["type"]): {
  Icon: LucideIcon;
  label: string;
} {
  switch (type) {
    case "board":
      return { Icon: Columns3, label: "Board" };
    case "list":
      return { Icon: List, label: "List" };
    case "gallery":
      return { Icon: LayoutGrid, label: "Gallery" };
    case "calendar":
      return { Icon: Calendar, label: "Calendar" };
    case "timeline":
      return { Icon: GanttChart, label: "Timeline" };
    case "table":
    default:
      return { Icon: Table, label: "Table" };
  }
}

function OptionRow({
  Icon,
  label,
  value,
  onClick,
}: {
  Icon: LucideIcon;
  label: string;
  value?: ReactNode;
  onClick?: () => void;
}) {
  const navigable = value !== undefined;
  if (navigable)
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            onClick={onClick}
            style={{ width: "100%", justifyContent: "flex-start" }}
          >
            <Icon className="tiptap-button-icon" />
            <span className="tiptap-button-text">{label}</span>
            <Spacer orientation="horizontal" />
            {navigable && (
              <span className="view-options__row-value">{value}</span>
            )}
            {navigable && (
              <ChevronRight className="tiptap-button-icon-sub" size={14} />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent>{value}</PopoverContent>
      </Popover>
    );
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      style={{ width: "100%", justifyContent: "flex-start" }}
    >
      <Icon className="tiptap-button-icon" />
      <span className="tiptap-button-text">{label}</span>
      <Spacer orientation="horizontal" />
      {navigable && <span className="view-options__row-value">{value}</span>}
      {navigable && (
        <ChevronRight className="tiptap-button-icon-sub" size={14} />
      )}
    </Button>
  );
}

function ViewOptionsContent({
  view,
  db,
  onClose,
}: {
  view: DatabaseView;
  db: UseDatabaseReturn;
  onClose?: () => void;
}) {
  const [name, setName] = useState(view.name);

  // Best-effort reads — confirm these field names against your own
  // DatabaseView / UseDatabaseReturn types and adjust as needed.
  const v = view as DatabaseView & {
    filters?: unknown[];
    sorts?: unknown[];
    hiddenProperties?: string[];
  };
  const totalProps =
    (db as unknown as { attrs?: { properties?: unknown[] } }).attrs?.properties
      ?.length ?? 0;
  const hiddenCount = v.hiddenProperties?.length ?? 0;
  const shownCount = Math.max(totalProps - hiddenCount, 0);

  const filterCount = v.filters?.length ?? 0;
  const sortCount = v.sorts?.length ?? 0;

  const { Icon: LayoutIcon } = layoutMeta(view.type);
  return (
    <Card className="view-options">
      <CardHeader>
        <CardGroupLabel>View options</CardGroupLabel>
        <Spacer orientation="horizontal" />
        {onClose && (
          <Button
            variant="ghost"
            className="view-options__close"
            onClick={onClose}
          >
            <X size={16} className="tiptap-button-icon" />
          </Button>
        )}
      </CardHeader>
      <CardBody style={{ width: "100%", padding: "5px 10px" }}>
        <CardItemGroup className="view-options__name" orientation="horizontal">
          <Button
            variant="ghost"
            data-active-state="on"
            style={{ background: "transparent" }}
          >
            <LayoutIcon className="tiptap-button-icon" />
          </Button>
          <TextareaAutosize
            className="view-options__name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() =>
              db.updateView(db.activeView.id, { ...db.activeView, name })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                db.updateView(db.activeView.id, { ...db.activeView, name });
              }
            }}
            /* TODO: persist on blur/Enter via your rename handler */
          />
        </CardItemGroup>
        <LayoutPopover view={view} db={db} />
        <OptionRow
          Icon={SlidersHorizontal}
          label="Properties"
          value={`${shownCount} shown`}
          onClick={() => {
            /* open properties sub-panel */
          }}
        />
        <OptionRow
          Icon={Filter}
          label="Filter"
          value={filterCount === 1 ? "1 filter" : `${filterCount} filters`}
          onClick={() => {
            /* open filter sub-panel */
          }}
        />
        <OptionRow
          Icon={ArrowUpDown}
          label="Sort"
          value={sortCount === 1 ? "1 sort" : `${sortCount} sorts`}
          onClick={() => {
            /* open sort sub-panel */
          }}
        />
        <OptionRow Icon={Group} label="Group" value="None" onClick={() => {}} />
        <OptionRow
          Icon={ListTree}
          label="Sub-items"
          value="None"
          onClick={() => {}}
        />
        <Separator orientation="horizontal" />
        <OptionRow
          Icon={Bell}
          label="Slack notifications"
          value="None"
          onClick={() => {}}
        />
        <OptionRow Icon={Lock} label="Lock database" onClick={() => {}} />
        <OptionRow
          Icon={LinkIcon}
          label="Copy link to view"
          onClick={() => {}}
        />
        <OptionRow Icon={Copy} label="Duplicate view" onClick={() => {}} />
        <OptionRow Icon={Trash2} label="Delete view" onClick={() => {}} />
      </CardBody>
    </Card>
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
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!providedOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onOpenChange?.(false);
      }
    };
    document.addEventListener("mousedown", handleClick, true);
    return () => document.removeEventListener("mousedown", handleClick, true);
  }, [providedOpen, onOpenChange]);

  if (providedOpen !== undefined) {
    return providedOpen ? (
      <div
        ref={panelRef}
        style={{
          position: "absolute",
          right: 0,
          top: "100%",
          zIndex: 999,
          marginTop: 4,
        }}
      >
        <ViewOptionsContent
          view={view}
          db={db}
          onClose={() => onOpenChange?.(false)}
        />
      </div>
    ) : null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost">
          <Ellipsis className="tiptap-button-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="center"
        avoidCollisions
        collisionPadding={16}
        style={{ width: 280, padding: 0 }}
      >
        <ViewOptionsContent view={view} db={db} />
      </PopoverContent>
    </Popover>
  );
}
