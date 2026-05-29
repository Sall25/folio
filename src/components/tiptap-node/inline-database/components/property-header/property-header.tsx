import { useEffect, useState, type Ref } from "react";
import type {
  DatabaseProperty,
  PropertyConfig,
  SelectOption,
} from "../../types/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { PropertyEditPopover } from "../property-edit-popover";
import { SelectOptionsEditor } from "../../ui/select/select-options-editor";
import { useDatabaseContext } from "../../nodes/database-context";
import { PROPERTY_TYPE_ICONS } from "../../types/property-type-meta";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { DeletePropertyButton } from "../delete-property-button";
import { DuplicatePropertyButton } from "../duplicate-property-button";
import { FreezePropertyButton } from "../freeze-property-button";
import { UnwrapPropertyButton } from "../unwrap-property-button";
import { HidePropertyButton } from "../hide-property-button";
import { useResizableNode } from "src/components/tiptap-node/figure-node";
import FormulaEditor from "../formula-editor/formula-editor";
import { TextareaAutosize } from "src/components/tiptap-ui-primitive/textarea-auto-size";
export function PropertyHeader({ prop }: { prop: DatabaseProperty }) {
  const [open, setOpen] = useState(false);

  const { db, attrs } = useDatabaseContext();
  const Icon = PROPERTY_TYPE_ICONS[prop.config.type];
  const { nodeRef, handleResizeStart, isResizing } = useResizableNode();
  const [name, setName] = useState(prop.name);

  useEffect(() => {
    if (!isResizing || !nodeRef) return;
    const el = nodeRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      // dispatch a custom event with the propId and new width
      el.dispatchEvent(
        new CustomEvent("column:resize", {
          bubbles: true,
          detail: { propId: prop.id, width: el.offsetWidth },
        }),
      );
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [isResizing, nodeRef, prop.id]);

  return (
    <div
      className="db-th"
      ref={nodeRef as unknown as Ref<HTMLDivElement>}
      style={{ position: "relative" }}
      data-prop-id={prop.id}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="db-th__trigger"
            style={{
              width: "100%",
              borderRadius: "var(--tt-radius-sm)",
              justifyContent: "flex-start",
              overflow: "hidden",
              background: "transparent",
              fontSize: 15,
              color: "var(--tt-text-color)",
            }}
          >
            <Icon
              className="tiptap-button-icon"
              // fill="var(--tt-text-secondary)"
              style={{ width: 20, height: 18 }}
            />
            <span className="tiptap-button-text">{prop.name}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start">
          <Card
            style={{
              padding: "5px 10px",
              boxShadow: "var(--tt-shadow-elevated-sm)",
              minWidth: 260,
            }}
          >
            <CardHeader>
              <CardGroupLabel>Edit Property</CardGroupLabel>
            </CardHeader>
            <CardBody>
              <CardItemGroup>
                <CardItemGroup orientation="horizontal">
                  <Button variant="ghost">
                    <Icon className="tiptap-button-icon" />
                  </Button>
                  <TextareaAutosize
                    cols={30}
                    maxRows={1}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() =>
                      db.updateProperty(prop.id, {
                        ...prop,
                        name: name,
                      })
                    }
                    onSubmit={() =>
                      db.updateProperty(prop.id, {
                        ...prop,
                        name: name,
                      })
                    }
                  />
                </CardItemGroup>
                <PropertyEditPopover>
                  {prop.config.type === "select" ||
                    (prop.config.type === "multi_select" && (
                      <SelectOptionsEditor
                        options={prop.config.options}
                        onEditOption={(option) =>
                          db.updateProperty(prop.id, {
                            ...prop,
                            config: {
                              ...prop.config,
                              options: (
                                prop.config as {
                                  type: typeof prop.config.type;
                                  options: SelectOption[];
                                }
                              ).options.map((o) =>
                                o.id !== option.id ? o : option,
                              ),
                            } as PropertyConfig,
                          })
                        }
                        onChange={(options) =>
                          db.updateProperty(prop.id, {
                            ...prop,
                            config: {
                              ...(prop.config as {
                                type: "select";
                                options: SelectOption[];
                              }),
                              options,
                            },
                          })
                        }
                      />
                    ))}
                  {prop.config.type === "formula" && (
                    <FormulaEditor
                      propertyId={prop.id}
                      properties={attrs.properties}
                      onDone={() => setOpen(false)}
                    />
                  )}
                </PropertyEditPopover>
              </CardItemGroup>
              <CardItemGroup>
                <FreezePropertyButton
                  isFrozen={db.isFrozen(db.activeView.id, prop.id)}
                  onFreeze={() => db.freezeProperty(db.activeView.id, prop.id)}
                />
                <HidePropertyButton
                  onHide={() => db.hideProperty(db.activeView.id, prop.id)}
                />
                <UnwrapPropertyButton
                  isUnwrapped={db.isUnwrapped(db.activeView.id, prop.id)}
                  onUnwrap={() =>
                    db.toggleUnwrapProperty(db.activeView.id, prop.id)
                  }
                />
              </CardItemGroup>

              {prop.config.type !== "title" && (
                <CardItemGroup>
                  <Separator orientation="horizontal" />
                  <DuplicatePropertyButton onDuplicate={() => {}} />
                  <DeletePropertyButton
                    onDelete={() => db.deleteProperty(prop.id)}
                  />
                </CardItemGroup>
              )}
            </CardBody>
          </Card>
        </PopoverContent>
      </Popover>
      <span
        className="column-resizer"
        style={{ right: -8 }}
        onMouseDown={(e) => {
          if (nodeRef?.current) {
            const currentPx = nodeRef.current.getBoundingClientRect().width;
            nodeRef.current.style.width = `${currentPx}px`;
            //    nodeRef.current.style.flexBasis = `${currentPx}px`;
          }
          handleResizeStart?.(e, "right");
        }}
        onTouchStart={(e) => {
          if (nodeRef?.current) {
            const currentPx = nodeRef.current.getBoundingClientRect().width;
            nodeRef.current.style.width = `${currentPx}px`;
            //  nodeRef.current.style.flexBasis = `${currentPx}px`;
          }
          handleResizeStart?.(e, "right");
        }}
      />
    </div>
  );
}
