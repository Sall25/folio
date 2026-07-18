import {
  ArrowUpDown,
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Copy,
  Ellipsis,
  Filter,
  GanttChart,
  Group,
  LayoutGrid,
  LayoutTemplate,
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
import type { DatabaseProperty, DatabaseView, PanelView } from "src/types";
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
import { LayoutPanel, OpenPagesInPanel } from "./layout-panel";
import { PropertiesPanel } from "../properties-panel";
import { FilterPanel } from "../filter-panel";
import { SortPanel } from "../sort-panel";
import { Input } from "src/components/tiptap-ui-primitive/input";

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

const PANEL_TITLES: Record<Exclude<PanelView["type"], "main">, string> = {
  properties: "Properties",
  filter: "Filter",
  sort: "Sort",
  layout: "Layouts",
  "open-pages-in": "Open pages in",
  group: "Group",
  "sub-items": "Sub-items",
};

function OptionRow({
  Icon,
  label,
  sub,
  onClick,
  disabled = false,
  navigable = false,
}: {
  Icon: LucideIcon;
  label: string;
  sub?: string | ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  navigable?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      onClick={disabled ? undefined : onClick}
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
      {navigable && sub !== undefined && (
        <span className="view-options__row-value">{sub}</span>
      )}
      {navigable && (
        <ChevronRight className="tiptap-button-icon-sub" size={14} />
      )}
    </Button>
  );
}

function SubPanelHeader({
  title,
  onBack,
  onClose,
}: {
  title: string;
  onBack: () => void;
  onClose?: () => void;
}) {
  return (
    <CardHeader>
      <Button
        variant="ghost"
        className="view-options__back"
        onClick={onBack}
        style={{ background: "transparent" }}
      >
        <ChevronLeft size={16} className="tiptap-button-icon" />
      </Button>
      <CardGroupLabel>{title}</CardGroupLabel>
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
  onCopyLink?: () => void;
}) {
  const [name, setName] = useState(view.name);
  const [copied, setCopied] = useState(false);

  const locked = db.locked;
  const panel = db.currentPanel;

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

  // ── Sub-panel: replace the body, add a back header ──────────────────────
  if (panel.type !== "main") {
    return (
      <Card className="view-options">
        <SubPanelHeader
          title={PANEL_TITLES[panel.type] ?? "Options"}
          onBack={db.popPanel}
          onClose={onClose}
        />
        <CardBody style={{ width: "100%", padding: "5px 10px" }}>
          {panel.type === "properties" && (
            <PropertiesPanel
              bare
              properties={properties}
              db={db}
              activeView={view}
            />
          )}
          {panel.type === "filter" && (
            <FilterPanel
              bare
              properties={properties}
              db={db}
              activeView={view}
            />
          )}
          {panel.type === "sort" && (
            <SortPanel
              bare
              sorts={view.sorts}
              properties={properties}
              db={db}
              activeView={view}
            />
          )}
          {panel.type === "layout" && <LayoutPanel bare view={view} db={db} />}
          {panel.type === "open-pages-in" && <OpenPagesInPanel bare db={db} />}
          {/* group / sub-items land here once their panels exist */}
        </CardBody>
      </Card>
    );
  }

  // ── Main panel ──────────────────────────────────────────────────────────
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
          <Input
            className="view-options__name-input"
            autoFocus
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
                  db.updateView(db.activeView.id, {
                    ...db.activeView,
                    name,
                  });
              }
            }}
          />
        </CardItemGroup>

        <OptionRow
          Icon={LayoutTemplate}
          label="Layouts"
          sub={view.type.charAt(0).toUpperCase() + view.type.slice(1)}
          navigable
          onClick={() => db.pushPanel({ type: "layout" })}
          disabled={locked}
        />
        <OptionRow
          Icon={SlidersHorizontal}
          label="Properties"
          sub={`${shownCount} shown`}
          navigable
          onClick={() => db.pushPanel({ type: "properties" })}
          disabled={locked}
        />
        <OptionRow
          Icon={Filter}
          label="Filter"
          sub={filterCount === 1 ? "1 filter" : `${filterCount} filters`}
          navigable
          onClick={() => db.pushPanel({ type: "filter" })}
          disabled={locked}
        />
        <OptionRow
          Icon={ArrowUpDown}
          label="Sort"
          sub={sortCount === 1 ? "1 sort" : `${sortCount} sorts`}
          navigable
          onClick={() => db.pushPanel({ type: "sort" })}
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

        <OptionRow Icon={Bell} label="Slack notifications" onClick={() => {}} />

        <OptionRow
          Icon={Lock}
          label={locked ? "Unlock database" : "Lock database"}
          onClick={() => db.toggleLock()}
        />

        <OptionRow
          Icon={LinkIcon}
          label={copied ? "Copied!" : "Copy link to view"}
          onClick={handleCopy}
        />

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
    if (providedOpen) db.resetPanel();
  }, [providedOpen, db.resetPanel]);

  const closeControlled = () => {
    db.resetPanel();
    onOpenChange?.(false);
  };

  useEffect(() => {
    if (!providedOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeControlled();
      }
    };
    document.addEventListener("mousedown", handleClick, true);
    return () => document.removeEventListener("mousedown", handleClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          onClose={closeControlled}
        />
      </div>
    ) : null;
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        db.resetPanel();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost">
          <Ellipsis className="tiptap-button-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
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
