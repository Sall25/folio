import type {
  BoardView,
  DatabaseView,
  GalleryView,
  ID,
  OpenPageIn,
  TableView,
} from "src/types";
import { useDatabaseContext } from "../../context/database-context";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { PanelRight, Check, SquareSquare, Square } from "src/components/icons";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
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
import { CardLayoutPicker } from "./card-layout-picker";
import { LoadLimitPicker } from "./load-limit-picker";

interface LayoutPanelProps {
  view: DatabaseView;
  db: UseDatabaseReturn;
  bare?: boolean;
}

export function LayoutPanel({ view, db, bare = false }: LayoutPanelProps) {
  const { t } = useTranslation();
  const { editor } = useCurrentEditor();
  const { attrs, updateAttributes, source } = useDatabaseContext();

  // The four switches read and write settings that already exist:
  //   title       → the block's hideTitle
  //   lines       → this table view's showVerticalLines
  //   wrap        → this table view's per-column wrap list (none listed = all wrap)
  //   page icon   → the title property's showPageIcon (also in its own menu)
  const properties = source?.properties ?? [];
  const titleProp = properties.find((p) => p.config.type === "title");
  const isTable = view.type === "table";
  const showDbTitle = !attrs.hideTitle;
  const showVLines = (view as TableView).showVerticalLines ?? true;
  const unwrapped =
    (view as { unwrappedProperties?: ID[] }).unwrappedProperties ?? [];
  const wrapAllCols = unwrapped.length === 0;
  const showPageIcon =
    titleProp?.config.type === "title"
      ? (titleProp.config.showPageIcon ?? true)
      : true;
  const onSelect = (type: DatabaseView["type"]) => {
    if (view.type === type) return;
    db.updateView(view.id, { ...view, type });
  };

  if (!editor) return null;

  const openIn: OpenPageIn = db.activeView.openPageIn ?? "Side";
  const openInLabel =
    openIn === "Side"
      ? t("database.layout.sidePeek")
      : openIn === "Center"
        ? t("database.layout.centerPeek")
        : t("database.layout.fullPage");

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

      <MenuRow
        label={t("database.layout.showDatabaseTitle")}
        toggle
        checked={showDbTitle}
        onToggle={() => updateAttributes({ ...attrs, hideTitle: showDbTitle })}
      />
      {isTable && (
        <>
          <MenuRow
            label={t("database.layout.showVerticalLines")}
            toggle
            checked={showVLines}
            onToggle={() =>
              db.updateView(view.id, {
                showVerticalLines: !showVLines,
              } as Partial<DatabaseView>)
            }
          />
          <MenuRow
            label={t("database.layout.wrapAllColumns")}
            toggle
            checked={wrapAllCols}
            onToggle={() =>
              db.updateView(view.id, {
                unwrappedProperties: wrapAllCols
                  ? properties.map((p) => p.id)
                  : [],
              } as Partial<DatabaseView>)
            }
          />
        </>
      )}
      {(view.type === "gallery" || view.type === "board") && (
        <>
          <Separator orientation="horizontal" style={{ height: 0.5 }} />
          <NavigableMenuItem
            label={t("database.layout.cardPreview")}
            sub={
              (view as GalleryView).cardPreview === "none"
                ? t("database.layout.cardPreviewNone")
                : (view as GalleryView).cardPreview === "cover"
                  ? t("database.layout.cardPreviewCover")
                  : t("database.layout.cardPreviewContent")
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
                  {
                    value: "none",
                    label: t("database.layout.cardPreviewNone"),
                  },
                  {
                    value: "cover",
                    label: t("database.layout.cardPreviewCover"),
                  },
                  {
                    value: "content",
                    label: t("database.layout.cardPreviewContent"),
                  },
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
                    } as Partial<GalleryView | BoardView>)
                  }
                />
              ))}
            </Card>
          </NavigableMenuItem>
          <NavigableMenuItem
            label={t("database.layout.cardSize")}
            sub={
              (view as GalleryView | BoardView).cardSize === "small"
                ? t("database.layout.cardSizeSmall")
                : (view as GalleryView | BoardView).cardSize === "medium"
                  ? t("database.layout.cardSizeMedium")
                  : t("database.layout.cardSizeLarge")
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
                  { value: "small", label: t("database.layout.cardSizeSmall") },
                  {
                    value: "medium",
                    label: t("database.layout.cardSizeMedium"),
                  },
                  { value: "large", label: t("database.layout.cardSizeLarge") },
                ] as const
              ).map(({ value, label }) => (
                <MenuRow
                  key={value}
                  selected={(view as GalleryView).cardSize === value}
                  label={label}
                  onClick={() =>
                    db.updateView(view.id, {
                      cardSize: value,
                    } as Partial<GalleryView | BoardView>)
                  }
                />
              ))}
            </Card>
          </NavigableMenuItem>

          <MenuRow
            label={t("database.layout.fitImage")}
            toggle
            checked={(view as GalleryView | BoardView).coverFit == "contain"}
            onToggle={async () =>
              db.updateView(view.id, {
                coverFit:
                  (view as GalleryView | BoardView).coverFit === "contain"
                    ? "cover"
                    : "contain",
              } as Partial<GalleryView | BoardView>)
            }
          />
          <CardLayoutPicker
            value={(view as GalleryView | BoardView).cardLayout ?? "list"}
            onChange={(cardLayout) =>
              db.updateView(view.id, {
                cardLayout,
              } as Partial<GalleryView | BoardView>)
            }
          />
          <Separator orientation="horizontal" style={{ height: 0.5 }} />
        </>
      )}
      <MenuRow
        label={t("database.layout.openPagesIn")}
        sub={openInLabel}
        onClick={() => db.pushPanel({ type: "open-pages-in" })}
        navigable
      />
      {(isTable || view.type === "list") && (
        <LoadLimitPicker
          value={(view as TableView).loadLimit}
          onChange={(loadLimit) =>
            db.updateView(view.id, { loadLimit } as Partial<DatabaseView>)
          }
        />
      )}
      {titleProp && (
        <MenuRow
          label={t("database.layout.showPageIcon")}
          toggle
          checked={showPageIcon}
          onToggle={() =>
            void db.updateProperty(titleProp.id, {
              config: { type: "title", showPageIcon: !showPageIcon },
            })
          }
        />
      )}
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
        <CardGroupLabel>{t("database.layout.title")}</CardGroupLabel>
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
  const { t } = useTranslation();
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
                {t("database.layout.sidePeekDefault")}
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
        t("database.layout.sidePeek"),
        t("database.layout.sidePeekDesc"),
        "Side",
        true,
      )}
      <Spacer orientation="vertical" size={10} />
      {row(
        <SquareSquare className="tiptap-button-icon" />,
        t("database.layout.centerPeek"),
        t("database.layout.centerPeekDesc"),
        "Center",
      )}
      <Spacer orientation="vertical" size={10} />
      {row(
        <Square className="tiptap-button-icon" />,
        t("database.layout.fullPage"),
        t("database.layout.fullPageDesc"),
        "Full",
      )}
    </CardItemGroup>
  );

  if (bare) return body;

  return <Card style={{ padding: "5px 10px" }}>{body}</Card>;
}
