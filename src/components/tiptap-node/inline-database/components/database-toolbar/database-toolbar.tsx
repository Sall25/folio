import { useCallback, useState } from "react";
import {
  ArrowUpDown,
  Search,
  Plus,
  X,
  ChevronDown,
  ListFilter,
  Maximize2,
} from "lucide-react";

import { Button } from "src/components/tiptap-ui-primitive/button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import {
  Card,
  CardBody,
  CardFooter,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";

import type { DatabaseAttrs, DatabaseProperty, DatabaseView } from "src/types";
import type { UseDatabaseReturn } from "../../hooks/use-database";
import { type FilterGroup } from "src/types";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import { ViewOptionsPopover } from "./view-options-popover";
import { DatabaseViewTabs } from "../database-view-tabs/database-view-tabs";
import { FilterPanel } from "../filter-panel";
import { SortPanel } from "../sort-panel";
import { useDataSource } from "../../hooks/use-data-source";
import { usePages } from "src/hooks/use-pages";
import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { makeRowTemplate } from "src/utils/make-row-template";
import { DatabaseTitleBar } from "../database-title-bar";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import "./database-toolbar.scss";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { useDebouncedCallback } from "use-debounce";

interface DatabaseToolbarProps {
  attrs: DatabaseAttrs;
  db: UseDatabaseReturn;
  properties: DatabaseProperty[];
  onUpdateAttributes?: (attrs: DatabaseAttrs) => void;
  /** Notion-style lock: view config + structure frozen. Search and New
      (add record) stay available. */
  locked?: boolean;

  title: string;

  hideTitle?: boolean;

  onTitleChange: (title: string) => void;

  onHideTitleChange: (hide: boolean) => void;

  showFilterChips?: boolean;

  showSortChips?: boolean;

  onToggleFilterChips?: () => void;

  onToggleSortChips?: () => void;
}

function getActiveView(attrs: DatabaseAttrs): DatabaseView | undefined {
  return attrs.views.find((v) => v.id === attrs.activeViewId) ?? attrs.views[0];
}

function totalFilterRules(filters: FilterGroup[]): number {
  return filters.reduce((sum, g) => sum + g.rules.length, 0);
}

export function DatabaseToolbar({
  attrs,
  db,
  properties,
  onUpdateAttributes,
  locked = false,
  title,
  hideTitle,
  onTitleChange,
  onHideTitleChange,
  showFilterChips,
  showSortChips,
  onToggleFilterChips,
  onToggleSortChips,
}: DatabaseToolbarProps) {
  const activeView = getActiveView(attrs);
  const filters = activeView?.filters ?? [];
  const sorts = activeView?.sorts ?? [];
  const activeFilterCount = totalFilterRules(filters);
  const activeSortCount = sorts.length;
  const { data: pages } = usePages();
  const { setTarget } = usePageView();
  // Collapsed toolbar — the control cluster folds behind the chevron, leaving
  // just New. Local state, not view attrs: it's a per-session UI preference,
  // not something to sync to other clients.
  const [collapsed, setCollapsed] = useState(false);

  const { addRowTemplateAsync } = useDataSource(attrs.sourceId ?? null);

  const [viewOptionsOpen, setViewOptionsOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const onViewOptionsOpenChange = useCallback(
    (o: boolean) => setViewOptionsOpen(o),
    [setViewOptionsOpen],
  );
  const onTemplateOpenChange = useCallback(
    (o: boolean) => setTemplateOpen(o),
    [setTemplateOpen],
  );

  const isSingleView = attrs.views.length <= 1;

  // Keep the controls visible while one of their popovers is open, so they
  // don't disappear out from under the user when the mouse leaves the node.
  const showControls = !locked || viewOptionsOpen || templateOpen;
  const [showChevrons, setShowChevrons] = useState(false);

  const revealStyle: React.CSSProperties = {
    opacity: showControls ? 1 : 0,
    pointerEvents: showControls ? "auto" : "none",
    transition: "opacity 0.2s ease",
  };

  const { addRecordAsync, source } = useDataSource(attrs.sourceId);
  const handleNewPage = async () => {
    addRecordAsync({ title: "" })
      .then((page) => setTarget({ pageId: page.id, view: "Center" }))
      .catch(() => console.log("Failed to create page"));
  };

  const { setActivePageId } = useActivePage();

  // The database's own page — `source.pageId` when it's a standalone database,
  // falling back to the node's for an inline one. Same resolution the
  // copy-link handler uses.
  const dbPageId = source?.pageId ?? attrs.pageId ?? null;

  return (
    <CardItemGroup
      style={{
        marginBottom: 10,
        position: "relative",
        maxWidth: "var(--db-editor-width)",
        paddingRight: "20px",
      }}
    >
      <CardItemGroup orientation="horizontal">
        {/* One view → no tabs to switch between, so the title takes this slot
            and the database gets a single compact header row. More than one →
            tabs live here and the title bar sits on its own row above. */}
        {isSingleView ? (
          <DatabaseTitleBar
            title={title}
            hideTitle={hideTitle}
            onTitleChange={onTitleChange}
            onHideTitleChange={onHideTitleChange}
            locked={locked}
            onAddView={(type, label) => db.addView(type, label)}
          />
        ) : (
          <DatabaseViewTabs
            attrs={attrs}
            db={db}
            onRename={() => onViewOptionsOpenChange(true)}
            onUpdateAttributes={onUpdateAttributes}
            locked={locked}
          />
        )}
        <Spacer orientation="horizontal" />

        {/* Hover-revealed control cluster — search / filter / sort / group /
            hide / view-options / New. Hidden (but space kept) off-hover. */}
        <div
          style={revealStyle}
          onMouseOver={() => setShowChevrons(true)}
          onMouseLeave={() => setShowChevrons(false)}
        >
          <CardItemGroup orientation="horizontal">
            <Spacer orientation="horizontal" /*size={collapsed ? 10 : 3}*/ />

            {/* Chevron sits to the RIGHT of the collapsible group: the cluster
                is right-aligned, so collapsing moves everything to its LEFT.
                Anchored here, it stays exactly under the cursor across the
                toggle — no chasing the pointer.

                Always mounted when collapsed: it's the only way back. */}
            <Button
              variant="ghost"
              size="large"
              tooltip={collapsed ? "Show toolbar" : "Hide toolbar"}
              onClick={() => setCollapsed((v) => !v)}
              style={{
                // minHeight: 22,
                // height: 22,
                // borderRadius: "var(--tt-radius-sm)",
                background: "transparent",
                padding: 0,
                opacity: showChevrons || collapsed ? 1 : 0,
                pointerEvents: showChevrons || collapsed ? "auto" : "none",
                transition: "opacity 0.15s ease",
              }}
            >
              {collapsed ? (
                <ChevronsLeft
                  className="tiptap-button-icon"
                  style={{ width: 28, height: 24 }}
                  strokeWidth={1}
                  // size={18}
                />
              ) : (
                <ChevronsRight
                  className="tiptap-button-icon"
                  style={{ width: 28, height: 24 }}
                  strokeWidth={1}
                  // size={18}
                />
              )}
            </Button>

            <div
              className="db-toolbar__collapsible"
              data-collapsed={collapsed || undefined}
              aria-hidden={collapsed}
            >
              {/* Filter / Sort / Group / Hide-properties / View-options are all
                view config → hidden when locked. */}
              {!locked && (
                <>
                  <SearchButton db={db} />

                  <Spacer orientation="horizontal" size={1} />

                  {activeFilterCount > 0 ? (
                    // Rules exist → the button toggles the chip bar.
                    <Button
                      size="small"
                      variant="ghost"
                      tooltip={
                        showFilterChips ? "Hide filters" : "Show filters"
                      }
                      data-active-state="on"
                      onClick={onToggleFilterChips}
                      style={{
                        minHeight: 22,
                        height: 22,
                        borderRadius: "var(--tt-radius-sm)",
                        background: "transparent",
                      }}
                    >
                      <ListFilter className="tiptap-button-icon" size={14} />
                    </Button>
                  ) : (
                    // None yet → open the panel to create the first one.
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          tooltip="Filter"
                          data-active-state="off"
                          style={{
                            minHeight: 22,
                            height: 22,
                            borderRadius: "var(--tt-radius-sm)",
                            background: "transparent",
                          }}
                        >
                          <ListFilter
                            className="tiptap-button-icon"
                            size={14}
                          />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="bottom"
                        align="start"
                        className="db-panel"
                      >
                        <FilterPanel
                          properties={source?.properties ?? []}
                          db={db}
                          activeView={activeView}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                  <Spacer orientation="horizontal" size={1} />
                  {activeSortCount > 0 ? (
                    <Button
                      variant="ghost"
                      size="small"
                      tooltip={showSortChips ? "Hide sorts" : "Show sorts"}
                      data-active-state="on"
                      onClick={onToggleSortChips}
                      style={{
                        minHeight: 22,
                        height: 22,
                        borderRadius: "var(--tt-radius-sm)",
                        background: "transparent",
                      }}
                    >
                      <ArrowUpDown className="tiptap-button-icon" size={14} />
                    </Button>
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          tooltip="Sort"
                          variant="ghost"
                          data-active-state={activeSortCount > 0 ? "on" : "off"}
                          style={{
                            minHeight: 22,
                            height: 22,
                            borderRadius: "var(--tt-radius-sm)",
                            background: "transparent",
                          }}
                        >
                          <ArrowUpDown
                            className="tiptap-button-icon"
                            size={14}
                          />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="bottom"
                        align="start"
                        className="db-panel"
                      >
                        <SortPanel
                          properties={source?.properties ?? []}
                          db={db}
                          activeView={activeView}
                          sorts={sorts}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                  <Spacer orientation="horizontal" size={1} />
                  <Button
                    variant="ghost"
                    tooltip="Open as full page"
                    disabled={!dbPageId}
                    onClick={() => {
                      if (dbPageId == null) return;
                      // Clear any peek/center target first — otherwise the
                      // panel stays open behind the newly-opened page.
                      setTarget(undefined);
                      setActivePageId(dbPageId);
                    }}
                  >
                    <Maximize2 className="tiptap-button-icon" />
                  </Button>
                </>
              )}
            </div>
            {/* <Spacer orientation="horizontal" size={1} /> */}
            {activeView && (
              <ViewOptionsPopover
                properties={properties}
                db={db}
                view={activeView}
              />
            )}
            <Spacer orientation="horizontal" size={1} />
            {/* New record stays available when locked (adding data is allowed).
                The template dropdown changes the database template → frozen. */}
            {!collapsed && (
              <CardItemGroup
                orientation="horizontal"
                style={{
                  background: "var(--tt-brand-color-400)",
                  borderRadius: "var(--tt-radius-sm)",
                  color: "white",
                  minHeight: 30,
                  height: 30,
                  padding: "0px 8px",
                  cursor: "pointer",
                }}
                contentEditable={false}
              >
                <span
                  style={{ fontSize: 12.5, fontWeight: "bold" }}
                  onClick={handleNewPage}
                >
                  New
                </span>
                {!locked && (
                  <>
                    <Separator orientation="vertical" />
                    <Popover
                      open={templateOpen}
                      onOpenChange={onTemplateOpenChange}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          style={{
                            background: "transparent",
                            minWidth: 15,
                            width: 15,
                          }}
                        >
                          <ChevronDown
                            className="tiptap-button-icon"
                            style={{ color: "white" }}
                          />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <Card style={{ padding: "5px 10px" }}>
                          <CardBody
                            style={{
                              width: "100%",
                              justifyContent: "flex-start",
                            }}
                          >
                            <CardItemGroup>
                              {pages &&
                                pages
                                  .filter((p) => p.category === "Template")
                                  .map((p) => (
                                    <Button
                                      key={p.id}
                                      variant="ghost"
                                      style={{
                                        justifyContent: "flex-start",
                                        minHeight: 24,
                                        height: 24,
                                      }}
                                      onClick={() =>
                                        onUpdateAttributes?.({
                                          ...attrs,
                                          templateId: p.id,
                                        })
                                      }
                                    >
                                      <PageItemIcon cover={p.cover} />
                                      <span className="tiptap-button-text">
                                        {p.title}
                                      </span>
                                    </Button>
                                  ))}
                            </CardItemGroup>
                          </CardBody>
                          <CardFooter>
                            <Button
                              variant="ghost"
                              style={{
                                background: "var(--tt-brand-color-400)",
                                justifyContent: "flex-start",
                              }}
                              onClick={() => {
                                onTemplateOpenChange(false);
                                if (!source) return;
                                const rowTemplate = makeRowTemplate(source, {
                                  name: "New Template",
                                });
                                addRowTemplateAsync(rowTemplate);
                              }}
                            >
                              <Plus className="tiptap-button-icon" />
                              <span>Create a template</span>
                            </Button>
                          </CardFooter>
                        </Card>
                      </PopoverContent>
                    </Popover>
                  </>
                )}
              </CardItemGroup>
            )}
          </CardItemGroup>
        </div>

        {!locked && viewOptionsOpen && activeView && (
          <div style={{ position: "absolute", top: 25, right: 0, zIndex: 999 }}>
            <ViewOptionsPopover
              properties={properties}
              db={db}
              view={activeView}
              open={true}
              onOpenChange={() => setViewOptionsOpen(false)}
            />
          </div>
        )}
      </CardItemGroup>
    </CardItemGroup>
  );
}

function SearchButton({ db }: { db: UseDatabaseReturn }) {
  const [open, setOpen] = useState(false);

  // The input is driven by LOCAL state so keystrokes never touch the database.
  // Pushing to db.searchQuery re-renders the node view, recomputes the
  // filter+sort over every record, and re-publishes to every record node —
  // far too much work to do per character.
  const [draft, setDraft] = useState(db.searchQuery);

  const pushQuery = useDebouncedCallback(
    (q: string) => db.setSearchQuery(q),
    200,
    { maxWait: 600 },
  );

  const clear = () => {
    setDraft("");
    pushQuery.cancel();
    db.setSearchQuery("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) clear();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          tooltip="Search"
          data-active-state={db.searchQuery ? "on" : "off"}
          style={{
            minHeight: 22,
            height: 22,
            borderRadius: "var(--tt-radius-sm)",
            background: "transparent",
          }}
          onClick={() => setOpen(true)}
        >
          <Search size={14} className="tiptap-button-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="db-panel">
        <div className="db-search">
          <Search size={14} className="db-search__icon" />
          <Input
            autoFocus
            className="db-search__input"
            placeholder="Type to search..."
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              pushQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                clear();
                setOpen(false);
              }
              if (e.key === "Enter") {
                // Commit immediately rather than waiting out the debounce.
                e.preventDefault();
                pushQuery.flush();
              }
            }}
          />
          {draft && (
            <Button
              variant="ghost"
              className="db-search__clear"
              onClick={clear}
              aria-label="Clear search"
            >
              <X size={13} className="tiptap-button-icon" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
