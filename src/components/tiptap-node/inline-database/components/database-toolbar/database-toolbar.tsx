import { useCallback, useRef, useState } from "react";
import {
  ArrowUpDown,
  Group,
  Search,
  Plus,
  X,
  ChevronDown,
  ListFilter,
  SlidersHorizontal,
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
import { PropertiesPanel } from "../properties-panel";
import { GroupPanel } from "../group-panel";
import { useDataSource } from "../../hooks/use-data-source";
import { usePages } from "src/hooks/use-pages";
import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { makeRowTemplate } from "src/utils/make-row-template";
import { DatabaseTitleBar } from "../database-title-bar";

interface DatabaseToolbarProps {
  attrs: DatabaseAttrs;
  db: UseDatabaseReturn;
  properties: DatabaseProperty[];
  onUpdateAttributes?: (attrs: DatabaseAttrs) => void;
  /** Notion-style lock: view config + structure frozen. Search and New
      (add record) stay available. */
  locked?: boolean;
  /** Hover-reveal: when false the control cluster + add-view "+" are hidden
      (kept in layout) until the database node is hovered. */
  hovered?: boolean;

  title: string;

  hideTitle?: boolean;

  onTitleChange: (title: string) => void;

  onHideTitleChange: (hide: boolean) => void;
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
  hovered = false,
  title,
  hideTitle,
  onTitleChange,
  onHideTitleChange,
}: DatabaseToolbarProps) {
  const activeView = getActiveView(attrs);
  const filters = activeView?.filters ?? [];
  const sorts = activeView?.sorts ?? [];
  const props = activeView?.hiddenProperties ?? [];
  const activeFilterCount = totalFilterRules(filters);
  const activeSortCount = sorts.length;
  const activePropsCount = props.length;
  const { data: pages } = usePages();
  const { setTarget } = usePageView();

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
  const showControls = /* hovered*/ !locked || viewOptionsOpen || templateOpen;

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
            hovered={hovered}
          />
        )}
        <Spacer orientation="horizontal" />

        {/* Hover-revealed control cluster — search / filter / sort / group /
            hide / view-options / New. Hidden (but space kept) off-hover. */}
        <div style={revealStyle}>
          <CardItemGroup orientation="horizontal">
            {/* Search is reading — always available. */}
            <SearchButton db={db} />

            {/* Filter / Sort / Group / Hide-properties / View-options are all
                view config → hidden when locked. */}
            {!locked && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      tooltip="Filter"
                      data-active-state={activeFilterCount > 0 ? "on" : "off"}
                      style={{
                        minHeight: 22,
                        height: 22,
                        borderRadius: "var(--tt-radius-sm)",
                        background: "transparent",
                      }}
                    >
                      <ListFilter className="tiptap-button-icon" size={14} />
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
                      <ArrowUpDown className="tiptap-button-icon" size={14} />
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

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost">
                      <Group className="tiptap-button-icon" size={14} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    align="start"
                    className="db-panel"
                  >
                    <GroupPanel
                      properties={source?.properties ?? []}
                      db={db}
                      activeView={activeView}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      tooltip="Hide Properties"
                      variant="ghost"
                      data-active-state={activePropsCount > 0 ? "on" : "off"}
                      style={{
                        minHeight: 22,
                        height: 22,
                        borderRadius: "var(--tt-radius-sm)",
                        background: "transparent",
                      }}
                    >
                      <SlidersHorizontal
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
                    <PropertiesPanel
                      properties={source?.properties ?? []}
                      db={db}
                      activeView={activeView}
                    />
                  </PopoverContent>
                </Popover>

                {activeView && (
                  <ViewOptionsPopover
                    properties={properties}
                    db={db}
                    view={activeView}
                  />
                )}
              </>
            )}

            {/* New record stays available when locked (adding data is allowed).
                The template dropdown changes the database template → frozen. */}
            <CardItemGroup
              orientation="horizontal"
              style={{
                background: "var(--tt-brand-color-400)",
                borderRadius: "var(--tt-radius-sm)",
                color: "white",
                minHeight: 24,
                height: 24,
                padding: "0px 5px",
                cursor: "pointer",
              }}
            >
              <span
                style={{ fontSize: 11.5, fontWeight: "bold" }}
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
                        <CardBody>
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
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          onClick={() => setTimeout(() => inputRef.current?.focus(), 0)}
        >
          <Search size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="db-panel db-panel--search"
      >
        <div className="db-search">
          <Search size={13} className="db-search__icon" />
          <input
            ref={inputRef}
            className="db-search__input"
            placeholder="Search records..."
            value={db.searchQuery}
            onChange={(e) => db.setSearchQuery(e.target.value)}
          />
          {db.searchQuery && (
            <button
              className="db-search__clear"
              onClick={() => db.setSearchQuery("")}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
