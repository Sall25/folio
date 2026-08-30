import type {
  BoardView,
  DatabaseView,
  GalleryView,
  OpenPageIn,
} from "src/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  ChevronRight,
  Image,
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
import { type UseDatabaseReturn } from "../../hooks";
import { useCurrentEditor } from "@tiptap/react";
import {
  Grid,
  GridCell,
  GridRow,
} from "src/components/tiptap-ui-primitive/grid";
import { MenuRow } from "../menu-row";
import { NavigableMenuItem } from "../navigable-menu-item";
import { ViewPalette } from "./view-palette";

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
      <Grid columns="1fr 1fr 1fr" gap={5} style={{ gap: 10 }}>
        <GridRow style={{ gap: 10 }}>
          <GridCell>
            <ViewPalette
              onSelect={onSelect}
              active={view.type === "table"}
              type="table"
            />
          </GridCell>

          <GridCell>
            <ViewPalette
              onSelect={onSelect}
              active={view.type === "list"}
              type="list"
            />
          </GridCell>
          <GridCell>
            <ViewPalette
              onSelect={onSelect}
              active={view.type === "board"}
              type="board"
            />
          </GridCell>
        </GridRow>
        <GridRow style={{ gap: 10, marginTop: 10 }}>
          <GridCell>
            <ViewPalette
              onSelect={onSelect}
              active={view.type === "gallery"}
              type="gallery"
            />
          </GridCell>
          <GridCell>
            <ViewPalette
              onSelect={onSelect}
              active={view.type === "calendar"}
              type="calendar"
            />
          </GridCell>
          <GridCell>
            <ViewPalette
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
              <PopoverContent
                avoidCollisions
                collisionPadding={8}
                side="right"
                align="start"
              >
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

      <MenuRow
        label="Show database title"
        toggle
        checked={showDbTitle}
        onToggle={() => onToggleShowDbTitle?.()}
      />
      <MenuRow
        label="Show vertical lines"
        toggle
        checked={showVLines}
        onToggle={async () => onToggleShowVLines?.()}
      />
      <MenuRow
        label="Wrap all columns"
        toggle
        checked={wrapAllCols}
        onToggle={() => onToggleWrapAllCols?.()}
      />
      {view.type === "gallery" && (
        <>
          <Separator orientation="horizontal" style={{ height: 0.5 }} />
          <NavigableMenuItem
            // Icon={LayoutPanelTop}
            label="Card Preview"
            sub={
              (view as GalleryView).cardPreview === "none"
                ? "None"
                : (view as GalleryView).cardPreview === "cover"
                  ? "Page cover"
                  : "Page content"
            }
            side="right"
            align="center"
            alignOffset={6}
          >
            <Card
              style={{
                width: "fit-content",
                padding: "2px",
                borderRadius: "var(--tt-radius-sm)",
              }}
            >
              {(
                [
                  { value: "none", label: "None" },
                  { value: "cover", label: "Page cover" },
                  { value: "content", label: "Page content" },
                ] as const
              ).map(({ value, label }) => (
                <MenuRow
                  key={value}
                  selected={
                    (db.activeView as GalleryView).cardPreview == value ||
                    ((db.activeView as GalleryView).cardPreview === undefined &&
                      value === "none")
                  }
                  label={label}
                  onClick={() =>
                    db.updateView(view.id, {
                      cardPreview: value,
                    } as Partial<GalleryView>)
                  }
                />
              ))}
            </Card>
          </NavigableMenuItem>
          <NavigableMenuItem
            label="Card size"
            sub={
              (view as GalleryView).cardSize === "small"
                ? "Small"
                : (view as GalleryView).cardSize === "medium"
                  ? "Medium"
                  : "Large"
            }
            side="right"
            align="center"
            alignOffset={6}
          >
            <Card
              style={{
                width: "fit-content",
                padding: "2px",
                borderRadius: "var(--tt-radius-sm)",
              }}
            >
              {(
                [
                  { value: "small", label: "Small" },
                  { value: "medium", label: "Medium" },
                  { value: "large", label: "Large" },
                ] as const
              ).map(({ value, label }) => (
                <MenuRow
                  key={value}
                  selected={(view as GalleryView).cardSize === value}
                  label={label}
                  onClick={() =>
                    db.updateView(view.id, {
                      cardSize: value,
                    } as Partial<GalleryView>)
                  }
                />
              ))}
            </Card>
          </NavigableMenuItem>

          <MenuRow
            label="Fit image"
            toggle
            checked={(view as GalleryView).coverFit == "contain"}
            onToggle={async () =>
              db.updateView(view.id, {
                fitImage: !(view as GalleryView).coverFit,
              } as Partial<GalleryView>)
            }
          />
          <Separator orientation="horizontal" style={{ height: 0.5 }} />
        </>
      )}
      <MenuRow
        label="Open pages in"
        sub={openInLabel}
        onClick={() => db.pushPanel({ type: "open-pages-in" })}
        navigable
      />
      <MenuRow label="Show page icon" toggle />
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
    <Grid columns="34px 1fr 34px" style={{ width: "100%" }}>
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
                width: "100%",
                textWrap: "balance",
                fontSize: 12,
                paddingLeft: "10px",
                color: "var(--tt-text-secondary)",
                fontFamily: "inherit",
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
