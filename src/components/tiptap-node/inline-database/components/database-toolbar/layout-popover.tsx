import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type {
  BoardView,
  DatabaseView,
  GalleryView,
  OpenPageIn,
} from "src/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Calendar,
  ChevronRight,
  Columns3,
  Image,
  LayoutGrid,
  LayoutTemplate,
  List,
  Table,
  ChartGantt,
  PanelRight,
  Check,
  SquareSquare,
  Square,
} from "lucide-react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Toggle } from "src/components/tiptap-ui-primitive/toggle";
import { type UseDatabaseReturn } from "../../hooks";
import { useCurrentEditor } from "@tiptap/react";
import {
  Grid,
  GridCell,
  GridRow,
} from "src/components/tiptap-ui-primitive/grid";
import { useState } from "react";

function ViewPallette({
  type,
  active,
  onSelect,
}: {
  type: DatabaseView["type"];
  active?: boolean;
  onSelect: (type: DatabaseView["type"]) => void;
}) {
  return (
    <CardItemGroup
      className={`items-center w-24 h-24 border m-1 cursor-pointer ${
        active ? "border-brand" : ""
      }`}
      style={{
        color: "var(--tt-text-primary)",
        borderRadius: "var(--tt-radius-md)",
      }}
      onClick={() => onSelect(type)}
    >
      <CardItemGroup
        className={`items-center w-12 h-16 ${active ? "text-brand" : ""}`}
      >
        {type === "table" && <Table />}
        {type === "list" && <List />}
        {type === "board" && <Columns3 />}
        {type === "gallery" && <LayoutGrid />}
        {type === "calendar" && <Calendar />}
        {type === "timeline" && <ChartGantt />}
        <span className={`text-xs`}>
          {type === "table" && "Table"}
          {type === "list" && "List"}
          {type === "board" && "Board"}
          {type === "gallery" && "Gallery"}
          {type === "calendar" && "Calendar"}
          {type === "timeline" && "Timeline"}
        </span>
      </CardItemGroup>
    </CardItemGroup>
  );
}

interface LayoutPopoverProps {
  view: DatabaseView;
  db: UseDatabaseReturn;
  showDbTitle?: boolean;
  showVLines?: boolean;
  wrapAllCols?: boolean;
  onToggleShowDbTitle?: () => void;
  onToggleShowVLines?: () => void;
  onToggleWrapAllCols?: () => void;
}

export function LayoutPopover({
  view,
  db,
  onToggleShowDbTitle,
  onToggleShowVLines,
  onToggleWrapAllCols,
  showDbTitle = true,
  showVLines = true,
  wrapAllCols = false,
}: LayoutPopoverProps) {
  const { editor } = useCurrentEditor();
  const [openIn, setOpenIn] = useState(db.activeView.openPageIn ?? "Side");
  const onSelect = (type: DatabaseView["type"]) => {
    if (view.type === type) return;
    db.updateView(view.id, { ...view, type });
  };
  const onOpenInChange = (o: OpenPageIn) => {
    setOpenIn(o);
    db.updateView(db.activeView.id, { ...db.activeView, openPageIn: o });
  };

  if (!editor) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="w-full">
          <LayoutTemplate className="tiptap-button-icon" />
          <span className="tiptap-button-text">Layouts</span>
          <Spacer orientation="horizontal" />
          <span className="opacity-85" style={{ fontSize: 11 }}>
            {view.type.toUpperCase()}
          </span>
          <ChevronRight className="tiptap-button-icon-sub" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start">
        <Card
          style={{
            padding: "5px 10px",
            boxShadow: "var(--tt-shadow-elevated-sm)",
          }}
        >
          <CardHeader>
            <CardGroupLabel>Layouts</CardGroupLabel>
          </CardHeader>
          <CardBody className="w-full justify-start mt-2">
            <Grid columns="1fr 1fr 1fr">
              <GridRow>
                <GridCell>
                  <ViewPallette
                    onSelect={onSelect}
                    active={view.type === "table"}
                    type="table"
                  />
                </GridCell>
                <GridCell>
                  <ViewPallette
                    onSelect={onSelect}
                    active={view.type === "list"}
                    type="list"
                  />
                </GridCell>
                <GridCell>
                  <ViewPallette
                    onSelect={onSelect}
                    active={view.type === "board"}
                    type="board"
                  />
                </GridCell>
              </GridRow>
              <GridRow>
                <GridCell>
                  <ViewPallette
                    onSelect={onSelect}
                    active={view.type === "gallery"}
                    type="gallery"
                  />
                </GridCell>
                <GridCell>
                  <ViewPallette
                    onSelect={onSelect}
                    active={view.type === "calendar"}
                    type="calendar"
                  />
                </GridCell>
                <GridCell>
                  <ViewPallette
                    onSelect={onSelect}
                    active={view.type === "timeline"}
                    type="timeline"
                  />
                </GridCell>
              </GridRow>
            </Grid>

            {/* Card preview — board view only */}
            {view.type === "board" && (
              <>
                <CardItemGroup
                  className="w-full justify-start"
                  orientation="horizontal"
                >
                  <Image size={14} className="tiptap-button-icon" />
                  <span className="tiptap-button-text">Card preview</span>
                  <Spacer orientation="horizontal" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" style={{ fontSize: 11 }}>
                        <span className="opacity-85">
                          {(view as BoardView).cardPreview === "none"
                            ? "None"
                            : (view as BoardView).cardPreview === "cover"
                              ? "Page cover"
                              : "Page content"}
                        </span>
                        <ChevronRight className="tiptap-button-icon-sub" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start">
                      <Card className="p-2" style={{ minWidth: 140 }}>
                        <CardItemGroup>
                          {(
                            [
                              { value: "none", label: "None" },
                              { value: "cover", label: "Page cover" },
                              { value: "content", label: "Page content" },
                            ] as const
                          ).map(({ value, label }) => (
                            <Button
                              key={value}
                              variant="ghost"
                              style={{
                                justifyContent: "flex-start",
                                width: "100%",
                                fontWeight:
                                  (view as BoardView).cardPreview === value
                                    ? 600
                                    : 400,
                              }}
                              onClick={() =>
                                db.updateView(view.id, {
                                  cardPreview: value,
                                } as Partial<BoardView>)
                              }
                            >
                              <span className="tiptap-button-text">
                                {label}
                              </span>
                            </Button>
                          ))}
                        </CardItemGroup>
                      </Card>
                    </PopoverContent>
                  </Popover>
                </CardItemGroup>
                <Separator orientation="horizontal" />
              </>
            )}

            <CardItemGroup
              className="w-full justify-start"
              orientation="horizontal"
            >
              <Button variant="ghost" style={{ background: "transparent" }}>
                <span className="tiptap-button-text">Show database title</span>
              </Button>
              <Spacer orientation="horizontal" />
              <Toggle
                checked={showDbTitle}
                onChangeAsync={async () => onToggleShowDbTitle?.()}
              />
            </CardItemGroup>
            <CardItemGroup
              className="w-full justify-start"
              orientation="horizontal"
            >
              <Button variant="ghost" style={{ background: "transparent" }}>
                <span className="tiptap-button-text">Show vertical lines</span>
              </Button>

              <Spacer orientation="horizontal" />
              <Toggle
                checked={showVLines}
                onChangeAsync={async () => onToggleShowVLines?.()}
              />
            </CardItemGroup>
            <CardItemGroup
              className="w-full justify-start"
              orientation="horizontal"
            >
              <Button variant="ghost" style={{ background: "transparent" }}>
                <span className="tiptap-button-text">Wrap all columns</span>
              </Button>
              <Spacer orientation="horizontal" />
              <Toggle
                checked={wrapAllCols}
                onChangeAsync={async () => onToggleWrapAllCols?.()}
              />
            </CardItemGroup>

            {view.type === "gallery" && (
              <>
                <Separator orientation="horizontal" />

                {/* Card preview */}
                <CardItemGroup
                  className="w-full justify-start"
                  orientation="horizontal"
                >
                  <span className="tiptap-button-text">Card preview</span>
                  <Spacer orientation="horizontal" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" style={{ fontSize: 11 }}>
                        <span className="opacity-85">
                          {(view as GalleryView).cardPreview === "none"
                            ? "None"
                            : (view as GalleryView).cardPreview === "cover"
                              ? "Page cover"
                              : "Page content"}
                        </span>
                        <ChevronRight className="tiptap-button-icon-sub" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start">
                      <Card className="p-2" style={{ minWidth: 140 }}>
                        <CardItemGroup>
                          {(
                            [
                              { value: "none", label: "None" },
                              { value: "cover", label: "Page cover" },
                              { value: "content", label: "Page content" },
                            ] as const
                          ).map(({ value, label }) => (
                            <Button
                              key={value}
                              variant="ghost"
                              style={{
                                justifyContent: "flex-start",
                                width: "100%",
                                fontWeight:
                                  (view as GalleryView).cardPreview === value
                                    ? 600
                                    : 400,
                              }}
                              onClick={() =>
                                db.updateView(view.id, {
                                  cardPreview: value,
                                } as Partial<GalleryView>)
                              }
                            >
                              <span className="tiptap-button-text">
                                {label}
                              </span>
                            </Button>
                          ))}
                        </CardItemGroup>
                      </Card>
                    </PopoverContent>
                  </Popover>
                </CardItemGroup>

                {/* Card size */}
                <CardItemGroup
                  className="w-full justify-start"
                  orientation="horizontal"
                >
                  <span className="tiptap-button-text">Card size</span>
                  <Spacer orientation="horizontal" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" style={{ fontSize: 11 }}>
                        <span className="opacity-85">
                          {(view as GalleryView).cardSize === "small"
                            ? "Small"
                            : (view as GalleryView).cardSize === "medium"
                              ? "Medium"
                              : "Large"}
                        </span>
                        <ChevronRight className="tiptap-button-icon-sub" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start">
                      <Card className="p-2" style={{ minWidth: 140 }}>
                        <CardItemGroup>
                          {(
                            [
                              { value: "small", label: "Small" },
                              { value: "medium", label: "Medium" },
                              { value: "large", label: "Large" },
                            ] as const
                          ).map(({ value, label }) => (
                            <Button
                              key={value}
                              variant="ghost"
                              style={{
                                justifyContent: "flex-start",
                                width: "100%",
                                fontWeight:
                                  (view as GalleryView).cardSize === value
                                    ? 600
                                    : 400,
                              }}
                              onClick={() =>
                                db.updateView(view.id, {
                                  cardSize: value,
                                } as Partial<GalleryView>)
                              }
                            >
                              <span className="tiptap-button-text">
                                {label}
                              </span>
                            </Button>
                          ))}
                        </CardItemGroup>
                      </Card>
                    </PopoverContent>
                  </Popover>
                </CardItemGroup>

                {/* Fit image */}
                <CardItemGroup
                  className="w-full justify-start"
                  orientation="horizontal"
                >
                  <Button variant="ghost" style={{ background: "transparent" }}>
                    <span className="tiptap-button-text">Fit image</span>
                  </Button>
                  <Spacer orientation="horizontal" />
                  <Toggle
                    checked={(view as GalleryView).coverFit == "contain"}
                    onChangeAsync={async () =>
                      db.updateView(view.id, {
                        fitImage: !(view as GalleryView).coverFit,
                      } as Partial<GalleryView>)
                    }
                  />
                </CardItemGroup>

                <Separator orientation="horizontal" />
              </>
            )}

            <CardItemGroup>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost">
                    <span className="tiptap-button-text">Open pages in</span>
                    <Spacer orientation="horizontal" />
                    <span>
                      <span className="tiptap-button-text opacity-85">
                        Side peek
                      </span>
                      <ChevronRight className="tiptap-button-icon-sub" />
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <Card style={{ padding: "5px 10px" }}>
                    <CardItemGroup>
                      <Grid columns="34px 150px 34px">
                        <GridRow
                          style={{ cursor: "pointer" }}
                          onClick={() => onOpenInChange("Side")}
                        >
                          <GridCell>
                            <Button
                              variant="ghost"
                              style={{ background: "transparent" }}
                            >
                              <PanelRight className="tiptap-button-icon" />
                            </Button>
                          </GridCell>
                          <GridCell>
                            <CardItemGroup>
                              <CardGroupLabel>Side peek</CardGroupLabel>
                              <span
                                style={{
                                  display: "block",
                                  width: "150px",
                                  textWrap: "balance",
                                  fontSize: 12,
                                  paddingLeft: "10px",
                                  color: "var(--tt-text-secondary)",
                                }}
                              >
                                Open pages on the side. Keeps the view behind
                                interactive
                              </span>
                              <span
                                style={{
                                  color: "var(--tt-brand-color-400)",
                                  fontSize: 12,
                                  paddingLeft: "10px",
                                }}
                              >
                                Default for table
                              </span>
                            </CardItemGroup>
                          </GridCell>
                          <GridCell>
                            {openIn === "Side" && (
                              <Button variant="ghost">
                                <Check className="tiptap-button-icon" />
                              </Button>
                            )}
                          </GridCell>
                        </GridRow>
                      </Grid>
                      <Spacer orientation="vertical" size={10} />
                      <Grid columns="34px 150px 34px">
                        <GridRow
                          style={{ cursor: "pointer" }}
                          onClick={() => onOpenInChange("Center")}
                        >
                          <GridCell>
                            <Button
                              variant="ghost"
                              style={{ background: "transparent" }}
                            >
                              <SquareSquare className="tiptap-button-icon" />
                            </Button>
                          </GridCell>
                          <GridCell>
                            <CardItemGroup>
                              <CardGroupLabel>Center peek</CardGroupLabel>
                              <span
                                style={{
                                  display: "block",
                                  width: "150px",
                                  textWrap: "balance",
                                  fontSize: 12,
                                  paddingLeft: "10px",
                                  color: "var(--tt-text-secondary)",
                                }}
                              >
                                Open pages in a focused, centered modal
                              </span>
                              {/* <span style={{color: "var(--tt-brand-color-400)"}}>Default for table</span> */}
                            </CardItemGroup>
                          </GridCell>
                          <GridCell>
                            {openIn === "Center" && (
                              <Button variant="ghost">
                                <Check className="tiptap-button-icon" />
                              </Button>
                            )}
                          </GridCell>
                        </GridRow>
                      </Grid>
                      <Spacer orientation="vertical" size={10} />
                      <Grid columns="34px 150px 34px">
                        <GridRow
                          style={{ cursor: "pointer" }}
                          onClick={() => onOpenInChange("Full")}
                        >
                          <GridCell>
                            <Button
                              variant="ghost"
                              style={{ background: "transparent" }}
                            >
                              <Square className="tiptap-button-icon" />
                            </Button>
                          </GridCell>
                          <GridCell>
                            <CardItemGroup>
                              <CardGroupLabel>Full page</CardGroupLabel>
                              <span
                                style={{
                                  display: "block",
                                  width: "150px",
                                  textWrap: "balance",
                                  fontSize: 12,
                                  paddingLeft: "10px",
                                  color: "var(--tt-text-secondary)",
                                }}
                              >
                                Open pages in full page
                              </span>
                              {/* <span style={{color: "var(--tt-brand-color-400)"}}>Default for table</span> */}
                            </CardItemGroup>
                          </GridCell>
                          <GridCell>
                            {openIn === "Full" && (
                              <Button variant="ghost">
                                <Check className="tiptap-button-icon" />
                              </Button>
                            )}
                          </GridCell>
                        </GridRow>
                      </Grid>
                    </CardItemGroup>
                  </Card>
                </PopoverContent>
              </Popover>
              <CardItemGroup orientation="horizontal">
                <Button variant="ghost" style={{ background: "transparent" }}>
                  <span className="tiptap-button-text">Show page icon</span>
                </Button>
                <Spacer />
                <Toggle checked={true} />
              </CardItemGroup>
            </CardItemGroup>
          </CardBody>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
