import { useCallback, useRef, useState } from "react";
import {
  ArrowUpDown,
  Group,
  Eye,
  Search,
  Plus,
  X,
  ChevronDown,
  ListFilter,
  EyeOff,
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

import type { DatabaseAttrs, DatabaseView } from "../../types/types";
import type { UseDatabaseReturn } from "../../hooks/use-database";
import { type FilterGroup } from "../../types/filter-types";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import { usePeekPage } from "src/components/tiptap-templates/simple/context/peek-page-context";
import { ViewOptionsPopover } from "./view-options-popover";
import { useCreatePage } from "src/components/tiptap-templates/simple/context/create-page-context";
import { useActivePage } from "src/components/tiptap-templates/simple/use-active-page";
import { DatabaseViewTabs } from "../database-view-tabs/database-view-tabs";
import { FilterPanel } from "../filter-panel";
import { SortPanel } from "../sort-panel";
import { PropertiesPanel } from "../properties-panel";
import { GroupPanel } from "../group-panel";
import { useDataSource } from "../../hooks/use-data-source";
// ── Types ──────────────────────────────────────────────────────────────────

interface DatabaseToolbarProps {
  attrs: DatabaseAttrs;
  db: UseDatabaseReturn;
  onUpdateAttributes?: (attrs: DatabaseAttrs) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getActiveView(attrs: DatabaseAttrs): DatabaseView | undefined {
  return attrs.views.find((v) => v.id === attrs.activeViewId) ?? attrs.views[0];
}

function totalFilterRules(filters: FilterGroup[]): number {
  return filters.reduce((sum, g) => sum + g.rules.length, 0);
}

// ── Toolbar root ───────────────────────────────────────────────────────────
export function DatabaseToolbar({
  attrs,
  db,
  onUpdateAttributes,
}: DatabaseToolbarProps) {
  const activeView = getActiveView(attrs);
  const filters = activeView?.filters ?? [];
  const sorts = activeView?.sorts ?? [];
  const props = activeView?.hiddenProperties ?? [];
  const activeFilterCount = totalFilterRules(filters);
  const activeSortCount = sorts.length;
  const activePropsCount = props.length;
  const { pages, addPageTemplateAsync, addPageAsync } = usePages();
  const { activePageId } = useActivePage();
  const { setPeekPageId } = usePeekPage();
  const [viewOptionsOpen, setViewOptionsOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const { setCreatePageId } = useCreatePage();
  const onViewOptionsOpenChange = useCallback(
    (o: boolean) => setViewOptionsOpen(o),
    [setViewOptionsOpen],
  );

  const onTemplateOpenChange = useCallback(
    (o: boolean) => setTemplateOpen(o),
    [setTemplateOpen],
  );

  const { addRecordWithPageAsync, source } = useDataSource(attrs.sourceId);
  const handleNewPage = async () => {
    const rec = await addRecordWithPageAsync({
      title: "New Page",
      parentPageId: activePageId ?? null,
      createPage: addPageAsync,
    });
    // open the freshly created record's page in the create/peek panel
    if (rec.pageId != null) setCreatePageId(rec.pageId);
  };

  return (
    <CardItemGroup style={{ marginBottom: 10, position: "relative" }}>
      <CardItemGroup orientation="horizontal">
        <DatabaseViewTabs
          attrs={attrs}
          db={db}
          onRename={() => onViewOptionsOpenChange(true)}
          onUpdateAttributes={onUpdateAttributes}
        />
        <Spacer orientation="horizontal" />

        <CardItemGroup orientation="horizontal">
          <SearchButton db={db} />
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
                }}
              >
                <ListFilter className="tiptap-button-icon" size={14} />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="db-panel">
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
                }}
              >
                <ArrowUpDown className="tiptap-button-icon" size={14} />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="db-panel">
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
                {/* <span>Group</span> */}
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="db-panel">
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
                }}
              >
                {activePropsCount > 0 ? (
                  <EyeOff className="tiptap-button-icon" size={14} />
                ) : (
                  <Eye className="tiptap-button-icon" size={14} />
                )}
                {/* <span>Properties</span> */}
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="db-panel">
              <PropertiesPanel
                properties={source?.properties ?? []}
                db={db}
                activeView={activeView}
              />
            </PopoverContent>
          </Popover>
          {activeView && <ViewOptionsPopover db={db} view={activeView} />}

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
            <Separator orientation="vertical" />
            <Popover open={templateOpen} onOpenChange={onTemplateOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  style={{ background: "transparent", minWidth: 15, width: 15 }}
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
                        addPageTemplateAsync({
                          title: "New template",
                          parentId: null,
                        })
                          .then((newPage) => setPeekPageId(newPage.id))
                          .catch((err) =>
                            console.log("Failed to add a new template", err),
                          );
                      }}
                    >
                      <Plus className="tiptap-button-icon" />
                      <span>Create a template</span>
                    </Button>
                  </CardFooter>
                </Card>
              </PopoverContent>
            </Popover>
          </CardItemGroup>
        </CardItemGroup>
        {viewOptionsOpen && activeView && (
          <div style={{ position: "absolute", top: 25, right: 0, zIndex: 999 }}>
            <ViewOptionsPopover
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

// ── Search ─────────────────────────────────────────────────────────────────

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
