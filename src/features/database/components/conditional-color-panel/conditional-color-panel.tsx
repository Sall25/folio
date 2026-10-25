import { nanoid } from "nanoid";
import { Check, ChevronDown, Plus } from "src/components/icons";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import type {
  ColorRule,
  DatabaseProperty,
  DatabaseView,
  FilterRule,
  ID,
} from "src/types";
import type { UseDatabaseReturn } from "../../hooks/use-database";
import { FilterRow } from "../filter-rule-chips/filter-row";
import { makeFilterRule } from "../filter-rule-chips/utils/makeFilterRule";
import { COLOR_OPTIONS } from "../board-column-menu/utils";
import "../filter-rule-chips/filter-rule-chips.scss";
import "../board-column-menu/board-column-menu.scss";
import "./conditional-color-panel.scss";

// View settings › Conditional color: the view's colour rules, in order. Each
// is a condition (the same property / operator / value rows as a filter) and
// a colour; a record takes the colour of the first rule it matches. In a
// table a rule can paint just its property's cell.

/** Option types: their rules default to the picked option's own colour. */
const OPTION_TYPES = new Set(["select", "multi_select", "status"]);

export function ConditionalColorPanel({
  properties,
  db,
  activeView,
}: {
  properties: DatabaseProperty[];
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
  bare?: boolean;
}) {
  const { t } = useTranslation();
  if (!activeView) return null;

  const rules = activeView.colorRules ?? [];
  const isTable = activeView.type === "table";
  const save = (next: ColorRule[]) =>
    db.updateView(activeView.id, { colorRules: next });
  const update = (id: ID, patch: Partial<ColorRule>) =>
    save(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRule = () => {
    const property =
      properties.find((p) => OPTION_TYPES.has(p.config.type)) ?? properties[0];
    if (!property) return;
    save([
      ...rules,
      {
        id: nanoid(),
        rule: makeFilterRule(property),
        color: OPTION_TYPES.has(property.config.type) ? "default" : "red",
      },
    ]);
  };

  return (
    <div className="cc-panel">
      {rules.length === 0 ? (
        <p className="cc-panel__empty">
          {t("database.conditionalColor.empty")}
        </p>
      ) : (
        rules.map((colorRule) => {
          const property = properties.find(
            (p) => p.id === colorRule.rule.propertyId,
          );
          const optionType =
            !!property && OPTION_TYPES.has(property.config.type);
          const current =
            COLOR_OPTIONS.find((c) => c.id === colorRule.color) ??
            COLOR_OPTIONS[0];
          return (
            <div key={colorRule.id} className="cc-rule">
              <div className="cc-rule__head">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="cc-rule__color">
                      <Swatch color={current.id} />
                      <span className="tiptap-button-text">
                        {current.id === "default"
                          ? t("database.conditionalColor.optionColor")
                          : current.label}
                      </span>
                      <ChevronDown className="tiptap-button-icon-sub" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <Card style={{ padding: 5, minWidth: 170 }}>
                      <CardItemGroup style={{ width: "100%" }}>
                        {COLOR_OPTIONS.filter(
                          (c) => c.id !== "default" || optionType,
                        ).map((c) => (
                          <DropdownMenuItem key={c.id} asChild>
                            <Button
                              variant="ghost"
                              className="board-column-menu__color"
                              onClick={() =>
                                update(colorRule.id, { color: c.id })
                              }
                            >
                              <Swatch color={c.id} />
                              <span className="tiptap-button-text">
                                {c.id === "default"
                                  ? t("database.conditionalColor.optionColor")
                                  : c.label}
                              </span>
                              {c.id === current.id && (
                                <Check
                                  className="board-column-menu__check"
                                  size={14}
                                />
                              )}
                            </Button>
                          </DropdownMenuItem>
                        ))}
                      </CardItemGroup>
                    </Card>
                  </DropdownMenuContent>
                </DropdownMenu>

                {isTable && (
                  <label className="cc-rule__cell-only">
                    <input
                      type="checkbox"
                      checked={!!colorRule.cellOnly}
                      onChange={(e) =>
                        update(colorRule.id, { cellOnly: e.target.checked })
                      }
                    />
                    {t("database.conditionalColor.cellOnly")}
                  </label>
                )}
              </div>

              <FilterRow
                rule={colorRule.rule}
                index={0}
                groupOperator="and"
                properties={properties}
                onChange={(patch) =>
                  update(colorRule.id, {
                    rule: { ...colorRule.rule, ...patch } as FilterRule,
                  })
                }
                onDelete={() =>
                  save(rules.filter((r) => r.id !== colorRule.id))
                }
                onPropertyChange={(propertyId) => {
                  const next = properties.find((p) => p.id === propertyId);
                  if (!next) return;
                  update(colorRule.id, {
                    rule: { ...makeFilterRule(next), id: colorRule.rule.id },
                    // "Option color" only means something for option types.
                    color:
                      colorRule.color === "default" &&
                      !OPTION_TYPES.has(next.config.type)
                        ? "red"
                        : colorRule.color,
                  });
                }}
                onGroupOperatorChange={() => {}}
              />
            </div>
          );
        })
      )}

      <Button variant="ghost" className="cc-panel__add" onClick={addRule}>
        <Plus className="tiptap-button-icon" size={14} />
        <span className="tiptap-button-text">
          {t("database.conditionalColor.addRule")}
        </span>
      </Button>
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="board-column-menu__swatch"
      data-default={color === "default" || undefined}
      style={
        color === "default"
          ? undefined
          : ({
              "--swatch-color": `var(--tt-color-text-${color})`,
            } as React.CSSProperties)
      }
    />
  );
}
