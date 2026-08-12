import { Plus, ChevronDown } from "lucide-react";

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

import type { Page } from "src/types";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import { useDatabaseContext } from "../../nodes/database-context";
import { memo } from "react";

function NewRecordButtonImpl({
  collapsed,
  locked,
  templates,
  open,
  onOpenChange,
  onNewPage,
  onCreateTemplate,
}: {
  collapsed: boolean;
  locked: boolean;
  templates: Page[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewPage: () => void;
  onCreateTemplate: () => void;
}) {
  const { attrs, updateAttributes } = useDatabaseContext();
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
            <PopoverContent>
              <Card style={{ padding: "5px 10px" }}>
                <CardBody
                  style={{ width: "100%", justifyContent: "flex-start" }}
                >
                  <CardItemGroup>
                    {templates.map((p) => (
                      <Button
                        key={p.id}
                        variant="ghost"
                        style={{
                          justifyContent: "flex-start",
                          minHeight: 24,
                          height: 24,
                        }}
                        onClick={() =>
                          updateAttributes({ ...attrs, templateId: p.id })
                        }
                      >
                        <PageItemIcon cover={p.cover} />
                        <span className="tiptap-button-text">{p.title}</span>
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

export const NewRecordButton = memo(NewRecordButtonImpl);
