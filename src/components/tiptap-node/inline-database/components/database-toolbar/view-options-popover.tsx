import {
  ArrowUpDown,
  Bell,
  ChevronLeft,
  Copy,
  Group,
  Layout,
  Link as LinkIcon,
  ListFilter,
  ListTree,
  Lock,
  SlidersHorizontal,
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
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import type {
  BoardView,
  DatabaseProperty,
  DatabaseView,
  PanelView,
  TableView,
} from "src/types";
import { useEffect, useRef, useState } from "react";
import "./view-options-popover.scss";
import type { UseDatabaseReturn } from "../../hooks";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { LayoutPanel, OpenPagesInPanel } from "./layout-panel";
import { PropertiesPanel } from "../properties-panel";
import { FilterPanel } from "../filter-panel";
import { SortPanel } from "../sort-panel";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { SettingsSlidersIcon } from "src/components/tiptap-icons";
import { GroupPanel } from "../group-panel";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { IconPickerPopover } from "src/components/tiptap-ui/cover";
import { MenuRow } from "../menu-row";
import { usePanelTransition } from "../../hooks/use-panel-transition";
import { SpinnerRing } from "src/components/tiptap-ui-primitive/spinner-ring";
import { PanelSlide } from "../panel-slide";

const PANEL_TITLES: Record<Exclude<PanelView["type"], "main">, string> = {
  properties: "Properties",
  filter: "Filter",
  sort: "Sort",
  layout: "Layouts",
  "open-pages-in": "Open pages in",
  group: "Group",
  "sub-items": "Sub-items",
};

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
        // className="view-options__back"
        onClick={onBack}
        style={{
          background: "transparent",
        }}
      >
        <ChevronLeft size={16} className="tiptap-button-icon" />
      </Button>
      <Button
        variant="ghost"
        style={{
          background: "transparent",
          paddingLeft: 0,
          marginLeft: 0,
          minWidth: "fit-content",
          width: "fit-content",
          color: "var(--tt-text-primary)",
        }}
      >
        <span className="tiptap-button-text">{title}</span>
      </Button>
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

  const handleCopy = () => {
    onCopyLink?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Grouping lives on different fields per view type — board requires one,
  // table/list treat it as optional.
  const groupByPropertyId =
    view.type === "board"
      ? (view as BoardView).groupByPropertyId
      : ((view as TableView).groupByPropertyId ?? null);

  const groupLabel =
    properties.find((p) => p.id === groupByPropertyId)?.name ?? "None";

  // includeInitial=true → spinner also covers the first open (Rename / Edit view).
  const transitioning = usePanelTransition(panel.type, 180, true);

  // ── Sub-panel: replace the body, add a back header ──────────────────────
  if (panel.type !== "main") {
    return (
      <Card
        className="view-options"
        style={{
          maxHeight:
            "min(600px, var(--radix-popover-content-available-height))",
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
      >
        <SubPanelHeader
          title={PANEL_TITLES[panel.type] ?? "Options"}
          onBack={db.popPanel}
          onClose={onClose}
        />
        {transitioning ? (
          <div
            key={"div-transitioning"}
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "24px 0",
            }}
          >
            <SpinnerRing />
          </div>
        ) : (
          <CardBody
            key={"card-body"}
            style={{
              width: "100%",
              padding: "5px 10px",
              maxHeight:
                "min(600px, var(--radix-popover-content-available-height))",
              scrollbarWidth: "thin",
            }}
          >
            <PanelSlide panelKey={panel.type}>
              {panel.type === "properties" && (
                <PropertiesPanel
                  bare
                  properties={properties}
                  db={db}
                  activeView={view}
                />
              )}
              {panel.type === "group" && (
                <GroupPanel
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
              {panel.type === "layout" && (
                <LayoutPanel bare view={view} db={db} />
              )}
              {panel.type === "open-pages-in" && (
                <OpenPagesInPanel bare db={db} />
              )}
            </PanelSlide>
            {/* group / sub-items land here once their panels exist */}
          </CardBody>
        )}
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
      {transitioning ? (
        <div
          key={"div-transitioning-main"}
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "24px 0",
          }}
        >
          <SpinnerRing />
        </div>
      ) : (
        <CardBody
          key={"main-body"}
          style={{ width: "100%", padding: "5px 10px" }}
        >
          <CardItemGroup
            className="view-options__name"
            orientation="horizontal"
          >
            <IconPickerPopover
              onSelect={(name, color, target) => {
                db.updateView(view.id, {
                  ...view,
                  iconName: name,
                  color,
                  target,
                });
              }}
            >
              <Button
                variant="ghost"
                data-active-state="on"
                style={{ background: "transparent" }}
              >
                {view.target === "Emoji" ? (
                  <span key={"emoji"} className="tiptap-button-icon">
                    {view.iconName}
                  </span>
                ) : (
                  <DynamicIcon
                    key={"dynamic-icon"}
                    className="tiptap-button-icon"
                    name={view.iconName}
                    size={20}
                    style={{ color: view.color }}
                  />
                )}
              </Button>
            </IconPickerPopover>
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

          <MenuRow
            Icon={Layout}
            label="Layouts"
            sub={view.type.charAt(0).toUpperCase() + view.type.slice(1)}
            navigable
            onClick={() => db.pushPanel({ type: "layout" })}
            disabled={locked}
          />
          <MenuRow
            Icon={SlidersHorizontal}
            label="Properties"
            sub={`${shownCount} shown`}
            navigable
            onClick={() => db.pushPanel({ type: "properties" })}
            disabled={locked}
          />
          <MenuRow
            Icon={ListFilter}
            label="Filter"
            sub={filterCount === 1 ? "1 filter" : `${filterCount} filters`}
            navigable
            onClick={() => db.pushPanel({ type: "filter" })}
            disabled={locked}
          />
          <MenuRow
            Icon={ArrowUpDown}
            label="Sort"
            sub={sortCount === 1 ? "1 sort" : `${sortCount} sorts`}
            navigable
            onClick={() => db.pushPanel({ type: "sort" })}
            disabled={locked}
          />
          <MenuRow
            Icon={Group}
            label="Group"
            sub={groupLabel}
            navigable
            onClick={() => db.pushPanel({ type: "group" })}
            disabled={locked}
          />
          <MenuRow
            Icon={ListTree}
            label="Sub-items"
            onClick={locked ? undefined : () => {}}
            disabled={locked}
          />

          <Separator orientation="horizontal" />

          <MenuRow Icon={Bell} label="Slack notifications" onClick={() => {}} />

          <MenuRow
            Icon={Lock}
            label={locked ? "Unlock database" : "Lock database"}
            onClick={() => db.toggleLock()}
          />

          <MenuRow
            Icon={LinkIcon}
            label={copied ? "Copied!" : "Copy link to view"}
            onClick={handleCopy}
          />

          <MenuRow
            Icon={Copy}
            label="Duplicate view"
            onClick={locked ? undefined : () => {}}
            disabled={locked}
          />
          <MenuRow
            Icon={Trash2}
            label="Delete view"
            onClick={locked ? undefined : () => {}}
            disabled={locked}
            danger
          />
        </CardBody>
      )}
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

  // useEffect(() => {
  //   if (providedOpen) db.resetPanel();
  // }, [providedOpen, db.resetPanel]);

  const closeControlled = () => {
    db.resetPanel();
    onOpenChange?.(false);
  };

  useEffect(() => {
    if (!providedOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!panelRef.current) return;
      if (panelRef.current.contains(target)) return;

      // The IconPicker popover is portaled outside panelRef — don't treat clicks
      // inside any popper content as "outside".
      const el = target as HTMLElement;
      if (
        el.closest?.(
          "[data-radix-popper-content-wrapper], [data-radix-popover-content]",
        )
      ) {
        return;
      }

      closeControlled();
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
          right: 68,
          top: -20,
          zIndex: 999,
          marginTop: 4,
          // Cap to the space below the trigger and scroll, so it never runs off-screen.
          maxHeight: "calc(100vh - var(--trigger-bottom, 120px) - 16px)",
          overflowY: "auto",
          overscrollBehavior: "contain",
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

  if (!open) {
    return (
      <Button
        variant="ghost"
        tooltip="Settings"
        size="small"
        onClick={() => setOpen(true)}
        style={{ background: "transparent" }}
      >
        <SettingsSlidersIcon className="tiptap-button-icon" />
      </Button>
    );
  }

  return (
    <Popover
      open
      onOpenChange={(o) => {
        setOpen(o);
        db.resetPanel();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          tooltip="Settings"
          style={{ background: "transparent" }}
        >
          <SettingsSlidersIcon className="tiptap-button-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverPortal container={document.getElementById("root")}>
        <PopoverContent
          side="bottom"
          align="end"
          sideOffset={-26}
          avoidCollisions
          collisionPadding={4}
          style={{ zIndex: 999 }}
        >
          <ViewOptionsContent
            properties={properties}
            view={view}
            db={db}
            onCopyLink={onCopyLink}
          />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
