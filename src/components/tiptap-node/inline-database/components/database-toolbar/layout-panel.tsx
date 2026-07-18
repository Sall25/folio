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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Toggle } from "src/components/tiptap-ui-primitive/toggle";
import { type UseDatabaseReturn } from "../../hooks";
import { useCurrentEditor } from "@tiptap/react";
import {
  Grid,
  GridCell,
  GridRow,
} from "src/components/tiptap-ui-primitive/grid";

function ViewPallette({
  type,
  active,
  onSelect,
}: {
  type: DatabaseView["type"];
  active?: boolean;
  onSelect: (type: DatabaseView["type"]) => void;
}) {
  const label = type.charAt(0).toUpperCase() + type.slice(1); // table → Table, etc.

  const Icon =
    type === "table"
      ? Table
      : type === "list"
        ? List
        : type === "board"
          ? Columns3
          : type === "gallery"
            ? LayoutGrid
            : type === "calendar"
              ? Calendar
              : ChartGantt; // timeline

  return (
    <div
      onClick={() => onSelect(type)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: 96,
        height: 64,
        margin: 4,
        cursor: "pointer",
        borderRadius: "var(--tt-radius-lg)",
        border: `1.5px solid ${
          active
            ? "var(--tt-brand-color-400)"
            : "var(--tt-border-color, rgba(255,255,255,0.12))"
        }`,
        color: active ? "var(--tt-brand-color-400)" : "var(--tt-text-primary)",
        transition: "border-color 0.12s ease, color 0.12s ease",
      }}
    >
      <Icon size={20} />
      <span style={{ fontSize: 12, lineHeight: 1 }}>{label}</span>
    </div>
  );
}

interface LayoutPanelProps {
  view: DatabaseView;
  db: UseDatabaseReturn;
  bare?: boolean;
  showDbTitle?: boolean;
  showVLines?: boolean;
  wrapAllCols?: boolean;
  onToggleShowDbTitle?: () => void;
  onToggleShowVLines?: () => void;
  onToggleWrapAllCols?: () => void;
}

export function LayoutPanel({
  view,
  db,
  bare = false,
  onToggleShowDbTitle,
  onToggleShowVLines,
  onToggleWrapAllCols,
  showDbTitle = true,
  showVLines = true,
  wrapAllCols = false,
}: LayoutPanelProps) {
  const { editor } = useCurrentEditor();

  const onSelect = (type: DatabaseView["type"]) => {
    if (view.type === type) return;
    db.updateView(view.id, { ...view, type });
  };

  if (!editor) return null;

  const openIn: OpenPageIn = db.activeView.openPageIn ?? "Side";
  const openInLabel =
    openIn === "Side"
      ? "Side peek"
      : openIn === "Center"
        ? "Center peek"
        : "Full page";

  const content = (
    <div className="w-full mt-2">
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
                  <span className="tiptap-button-text">
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
                        <span className="tiptap-button-text">{label}</span>
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

      <CardItemGroup className="w-full justify-start" orientation="horizontal">
        <Button variant="ghost" style={{ background: "transparent" }}>
          <span className="tiptap-button-text">Show database title</span>
        </Button>
        <Spacer orientation="horizontal" />
        <Toggle
          checked={showDbTitle}
          onChangeAsync={async () => onToggleShowDbTitle?.()}
        />
      </CardItemGroup>
      <CardItemGroup className="w-full justify-start" orientation="horizontal">
        <Button variant="ghost" style={{ background: "transparent" }}>
          <span className="tiptap-button-text">Show vertical lines</span>
        </Button>
        <Spacer orientation="horizontal" />
        <Toggle
          checked={showVLines}
          onChangeAsync={async () => onToggleShowVLines?.()}
        />
      </CardItemGroup>
      <CardItemGroup className="w-full justify-start" orientation="horizontal">
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
                        <span className="tiptap-button-text">{label}</span>
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
                        <span className="tiptap-button-text">{label}</span>
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

      {/* Open pages in → pushes a sub-panel onto the stack */}
      <CardItemGroup>
        <Button
          variant="ghost"
          onClick={() => db.pushPanel({ type: "open-pages-in" })}
          style={{ width: "100%", justifyContent: "flex-start" }}
        >
          <span className="tiptap-button-text">Open pages in</span>
          <Spacer orientation="horizontal" />
          <span className="tiptap-button-text opacity-85">{openInLabel}</span>
          <ChevronRight className="tiptap-button-icon-sub" />
        </Button>

        <CardItemGroup orientation="horizontal">
          <Button variant="ghost" style={{ background: "transparent" }}>
            <span className="tiptap-button-text">Show page icon</span>
          </Button>
          <Spacer />
          <Toggle checked={true} />
        </CardItemGroup>
      </CardItemGroup>
    </div>
  );

  if (bare) return content;

  return (
    <Card
      style={{
        padding: "5px 10px",
        boxShadow: "var(--tt-shadow-elevated-sm)",
      }}
    >
      <CardHeader>
        <CardGroupLabel>Layouts</CardGroupLabel>
      </CardHeader>
      <CardBody className="w-full justify-start">{content}</CardBody>
    </Card>
  );
}

export function OpenPagesInPanel({
  db,
  bare = false,
}: {
  db: UseDatabaseReturn;
  bare?: boolean;
}) {
  const openIn: OpenPageIn = db.activeView.openPageIn ?? "Side";
  const onOpenInChange = (o: OpenPageIn) =>
    db.updateView(db.activeView.id, { ...db.activeView, openPageIn: o });

  const row = (
    icon: React.ReactNode,
    title: string,
    desc: string,
    value: OpenPageIn,
    isDefault?: boolean,
  ) => (
    <Grid columns="34px 150px 34px">
      <GridRow
        style={{ cursor: "pointer" }}
        onClick={() => onOpenInChange(value)}
      >
        <GridCell>
          <Button variant="ghost" style={{ background: "transparent" }}>
            {icon}
          </Button>
        </GridCell>
        <GridCell>
          <CardItemGroup>
            <CardGroupLabel>{title}</CardGroupLabel>
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
              {desc}
            </span>
            {isDefault && (
              <span
                style={{
                  color: "var(--tt-brand-color-400)",
                  fontSize: 12,
                  paddingLeft: "10px",
                }}
              >
                Default for table
              </span>
            )}
          </CardItemGroup>
        </GridCell>
        <GridCell>
          {openIn === value && (
            <Button variant="ghost">
              <Check className="tiptap-button-icon" />
            </Button>
          )}
        </GridCell>
      </GridRow>
    </Grid>
  );

  const body = (
    <CardItemGroup>
      {row(
        <PanelRight className="tiptap-button-icon" />,
        "Side peek",
        "Open pages on the side. Keeps the view behind interactive",
        "Side",
        true,
      )}
      <Spacer orientation="vertical" size={10} />
      {row(
        <SquareSquare className="tiptap-button-icon" />,
        "Center peek",
        "Open pages in a focused, centered modal",
        "Center",
      )}
      <Spacer orientation="vertical" size={10} />
      {row(
        <Square className="tiptap-button-icon" />,
        "Full page",
        "Open pages in full page",
        "Full",
      )}
    </CardItemGroup>
  );

  if (bare) return body;

  return <Card style={{ padding: "5px 10px" }}>{body}</Card>;
}
