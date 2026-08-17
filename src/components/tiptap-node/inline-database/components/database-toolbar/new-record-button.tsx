import { Plus, Check, Maximize2, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
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
import type { ID, PageCover, RowTemplate } from "src/types";
import { usePagesBase } from "src/hooks/use-pages";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { FileIcon } from "src/components/tiptap-icons";

const EMPTY_TEMPLATES: RowTemplate[] = [];

export function NewRecordButton({
  collapsed,
  locked,
  templates,
  defaultTemplateId,
  open,
  onOpenChange,
  onNewPage,
  onPickTemplate,
  onOpenTemplate,
  onDeleteTemplate,
  onSetDefault,
  onCreateTemplate,
}: {
  collapsed: boolean;
  locked: boolean;
  templates: RowTemplate[];
  defaultTemplateId: ID | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Main "New" — creates a row (from the default template if one is set). */
  onNewPage: () => void;
  /** Click a template name — create a row from THAT template now. */
  onPickTemplate: (templateId: ID) => void;
  /** Open the template's page in center view to edit its content. */
  onOpenTemplate: (templateId: ID) => void;
  onDeleteTemplate: (templateId: ID) => void;
  /** Toggle which template is the default (null clears it). */
  onSetDefault: (templateId: ID | null) => void;
  onCreateTemplate: () => void;
}) {
  // resolve template names from their pages, searching ALL pages (not usePages,
  // which excludes sourceId != null — template pages have a sourceId).
  const { data: templatePageInfo } = usePagesBase((all) => {
    const ids = new Set((templates ?? []).map((t) => t.pageId));
    const map: Record<string, { title: string; cover: PageCover | null }> = {};
    for (const p of all)
      if (ids.has(p.id)) map[p.id] = { title: p.title, cover: p.cover };
    return map;
  });

  const templatesWithNames = (templates ?? EMPTY_TEMPLATES).map((tpl) => {
    const info = tpl.pageId ? templatePageInfo?.[tpl.pageId] : undefined;
    return {
      ...tpl,
      name: info?.title || tpl.name || "Untitled template",
      cover: info?.cover ?? null,
    };
  });

  if (collapsed) return null;

  return (
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
      {/* Main New — uses the default template if set, else blank. */}
      <span style={{ fontSize: 12.5, fontWeight: "bold" }} onClick={onNewPage}>
        New
      </span>

      {!locked && (
        <>
          <Separator orientation="vertical" />
          <Popover open={open} onOpenChange={onOpenChange}>
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
            <PopoverContent align="end">
              <Card
                style={{
                  padding: "5px",
                  minWidth: 240,
                  borderRadius: "var(--tt-radius-sm)",
                }}
              >
                <CardBody
                  style={{ width: "100%", justifyContent: "flex-start" }}
                >
                  <CardItemGroup style={{ width: "100%" }}>
                    {templatesWithNames.length === 0 && (
                      <span
                        style={{
                          fontSize: 12,
                          opacity: 0.6,
                          padding: "4px 6px",
                        }}
                      >
                        No templates yet
                      </span>
                    )}

                    {templatesWithNames.map((tpl) => {
                      const isDefault = tpl.id === defaultTemplateId;
                      return (
                        <div
                          key={tpl.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            width: "100%",
                            gap: 2,
                          }}
                        >
                          {/* Set-as-default toggle (the gap you spotted). */}
                          {isDefault && (
                            <Button
                              variant="ghost"
                              aria-label={
                                isDefault
                                  ? "Default template"
                                  : "Set as default"
                              }
                              style={{
                                minWidth: 24,
                                width: 24,
                                minHeight: 24,
                                height: 24,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSetDefault(null);
                              }}
                            >
                              <Check
                                className="tiptap-button-icon"
                                size={13}
                                style={{ color: "var(--tt-brand-color-400)" }}
                              />
                            </Button>
                          )}

                          {/* Name click → create a row FROM this template now. */}
                          <Button
                            variant="ghost"
                            style={{
                              justifyContent: "flex-start",
                              flex: 1,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetDefault(isDefault ? null : tpl.id);
                              onPickTemplate(tpl.id);
                            }}
                          >
                            {tpl.cover?.iconName ? (
                              <DynamicIcon
                                key="dynamic-icon"
                                className="tiptap-button-icon"
                                size={16}
                                name={tpl.cover.iconName}
                              />
                            ) : (
                              <FileIcon
                                key="file-icon"
                                className="tiptap-button-icon"
                              />
                            )}
                            <span className="tiptap-button-text">
                              {tpl.name}
                            </span>
                          </Button>

                          {/* Open the template page to edit its content. */}
                          <Button
                            variant="ghost"
                            aria-label="Edit template"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!tpl.pageId) return;
                              console.log("pageId", tpl.pageId);
                              onOpenTemplate(tpl.pageId);
                            }}
                          >
                            <Maximize2
                              className="tiptap-button-icon"
                              size={13}
                            />
                          </Button>

                          {/* Delete the template (page + registration). */}
                          <Button
                            variant="ghost"
                            size="small"
                            aria-label="Delete template"
                            className="delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTemplate(tpl.id);
                            }}
                          >
                            <Trash2 className="tiptap-button-icon" size={13} />
                          </Button>
                        </div>
                      );
                    })}
                  </CardItemGroup>
                </CardBody>
                <Separator orientation="horizontal" style={{ height: 0.5 }} />
                <CardFooter style={{ width: "100%" }}>
                  <Button
                    variant="ghost"
                    style={{
                      width: "100%",
                      justifyContent: "flex-start",
                    }}
                    onClick={onCreateTemplate}
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
  );
}
