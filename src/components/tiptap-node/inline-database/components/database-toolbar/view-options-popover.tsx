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
import type { DatabaseProperty, DatabaseView } from "../../types/types";
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
import { PropertiesPanel } from "../properties-panel";
import { FilterPanel } from "../filter-panel";
import { SortPanel } from "../sort-panel";

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
  sub,
  value,
  onClick,
  disabled = false,
}: {
  Icon: LucideIcon;
  label: string;
  sub?: string | ReactNode;
  value?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const navigable = value !== undefined;
  if (navigable)
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            onClick={onClick}
            disabled={disabled}
            style={{
              width: "100%",
              justifyContent: "flex-start",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <Icon className="tiptap-button-icon" />
            <span className="tiptap-button-text">{label}</span>
            <Spacer orientation="horizontal" />
            {navigable && (
              <span className="view-options__row-value">{sub}</span>
            )}
            {navigable && (
              <ChevronRight className="tiptap-button-icon-sub" size={14} />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent side="left" align="start">
          {value}
        </PopoverContent>
      </Popover>
    );
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        justifyContent: "flex-start",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon className="tiptap-button-icon" />
      <span className="tiptap-button-text">{label}</span>
      <Spacer orientation="horizontal" />
    </Button>
  );
}

function ViewOptionsContent({
  view,
  db,
  onClose,
  properties,
  onCopyLink,
}: {
  view: DatabaseView;
  db: UseDatabaseReturn;
  properties: DatabaseProperty[];
  onClose?: () => void;
  // copy-link needs pageId, which db doesn't have → stays a prop from the
  // node-view / toolbar. Lock lives on db (db.locked / db.toggleLock).
  onCopyLink?: () => void;
}) {
  const [name, setName] = useState(view.name);
  const [copied, setCopied] = useState(false);

  const locked = db.locked;

  const v = view as DatabaseView & {
    filters?: unknown[];
    sorts?: unknown[];
    hiddenProperties?: string[];
  };

  const totalProps = properties.length;
  const hiddenCount = view.hiddenProperties?.length ?? 0;
  const shownCount = Math.max(totalProps - hiddenCount, 0);

  const filterCount = v.filters?.length ?? 0;
  const sortCount = v.sorts?.length ?? 0;

  const { Icon: LayoutIcon } = layoutMeta(view.type);

  const handleCopy = () => {
    onCopyLink?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
            disabled={locked}
            onBlur={() =>
              !locked &&
              db.updateView(db.activeView.id, { ...db.activeView, name })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                if (!locked)
                  db.updateView(db.activeView.id, { ...db.activeView, name });
              }
            }}
          />
        </CardItemGroup>

        {/* Layout / properties / filter / sort / group / sub-items are all
            view config → disabled when locked. */}
        {!locked && <LayoutPopover view={view} db={db} />}
        <OptionRow
          Icon={SlidersHorizontal}
          label="Properties"
          sub={`${shownCount} shown`}
          value={
            locked ? undefined : (
              <PropertiesPanel
                properties={properties}
                db={db}
                activeView={view}
              />
            )
          }
          disabled={locked}
        />
        <OptionRow
          Icon={Filter}
          label="Filter"
          sub={filterCount === 1 ? "1 filter" : `${filterCount} filters`}
          value={
            locked ? undefined : (
              <FilterPanel properties={properties} db={db} activeView={view} />
            )
          }
          disabled={locked}
        />
        <OptionRow
          Icon={ArrowUpDown}
          label="Sort"
          sub={sortCount === 1 ? "1 sort" : `${sortCount} sorts`}
          value={
            locked ? undefined : (
              <SortPanel
                sorts={view.sorts}
                properties={properties}
                db={db}
                activeView={view}
              />
            )
          }
          disabled={locked}
        />
        <OptionRow
          Icon={Group}
          label="Group"
          onClick={locked ? undefined : () => {}}
          disabled={locked}
        />
        <OptionRow
          Icon={ListTree}
          label="Sub-items"
          onClick={locked ? undefined : () => {}}
          disabled={locked}
        />

        <Separator orientation="horizontal" />

        {/* Slack notifications — backend feature, placeholder. */}
        <OptionRow Icon={Bell} label="Slack notifications" onClick={() => {}} />

        {/* Lock toggle — always available; reads/writes db. */}
        <OptionRow
          Icon={Lock}
          label={locked ? "Unlock database" : "Lock database"}
          onClick={() => {
            db.toggleLock();
            console.log("locked", locked);
          }}
        />

        {/* Copy link — read-only, always available. */}
        <OptionRow
          Icon={LinkIcon}
          label={copied ? "Copied!" : "Copy link to view"}
          onClick={handleCopy}
        />

        {/* Duplicate / delete view — structural, disabled when locked. */}
        <OptionRow
          Icon={Copy}
          label="Duplicate view"
          onClick={locked ? undefined : () => {}}
          disabled={locked}
        />
        <OptionRow
          Icon={Trash2}
          label="Delete view"
          onClick={locked ? undefined : () => {}}
          disabled={locked}
        />
      </CardBody>
    </Card>
  );
}

export function ViewOptionsPopover({
  view,
  db,
  properties,
  open: providedOpen,
  onOpenChange,
  onCopyLink,
}: {
  view: DatabaseView;
  open?: boolean;
  db: UseDatabaseReturn;
  properties: DatabaseProperty[];
  onOpenChange?: (o: boolean) => void;
  onCopyLink?: () => void;
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
          properties={properties}
          view={view}
          db={db}
          onCopyLink={onCopyLink}
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
        <ViewOptionsContent
          properties={properties}
          view={view}
          db={db}
          onCopyLink={onCopyLink}
        />
      </PopoverContent>
    </Popover>
  );
}
