import { useTranslation } from "react-i18next";
import { MaterialIcon } from "src/components/icons";
import {
  ICON_VARIANTS,
  ICON_WEIGHTS,
  useIconStyle,
  type IconVariant,
} from "src/components/icons/icon-style";
import { Toggle } from "src/components/tiptap-ui-primitive/toggle";

// My settings → how icons look across Folio on this device: style, weight,
// filled or outlined, with a preview. Page icons given their own look in the
// icon picker keep it.

const PREVIEW = ["home", "inbox", "search", "description", "star", "settings"];

const WEIGHT_LABELS: Record<number, string> = {
  200: "iconStyle.thin",
  300: "iconStyle.light",
  400: "iconStyle.regular",
  600: "iconStyle.bold",
};

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="ws-setting-row">
      <div className="ws-setting-row__text">
        <span className="ws-setting-row__label">{label}</span>
        {description && (
          <span className="ws-setting-row__desc">{description}</span>
        )}
      </div>
      <div className="ws-setting-row__control">{children}</div>
    </div>
  );
}

export function IconStyleSettings() {
  const { t } = useTranslation();
  const [style, setStyle] = useIconStyle();

  return (
    <>
      <Row
        label={t("settings.mySettings.iconStyle")}
        description={
          <>
            {t("settings.mySettings.iconStyleDesc")}
            <span
              style={{
                display: "flex",
                gap: 10,
                marginTop: 8,
                color: "var(--tt-text-primary)",
              }}
            >
              {PREVIEW.map((name) => (
                <MaterialIcon key={name} name={name} size={20} />
              ))}
            </span>
          </>
        }
      >
        <select
          className="ws-select"
          value={style.variant}
          onChange={(e) =>
            setStyle({ ...style, variant: e.target.value as IconVariant })
          }
        >
          {ICON_VARIANTS.map((v) => (
            <option key={v} value={v}>
              {t(`iconStyle.${v}`)}
            </option>
          ))}
        </select>
      </Row>
      <Row
        label={t("settings.mySettings.iconWeight")}
        description={t("settings.mySettings.iconWeightDesc")}
      >
        <select
          className="ws-select"
          value={style.weight}
          onChange={(e) =>
            setStyle({ ...style, weight: Number(e.target.value) })
          }
        >
          {ICON_WEIGHTS.map((w) => (
            <option key={w} value={w}>
              {t(WEIGHT_LABELS[w])}
            </option>
          ))}
        </select>
      </Row>
      <Row
        label={t("settings.mySettings.iconFilled")}
        description={t("settings.mySettings.iconFilledDesc")}
      >
        <Toggle
          checked={style.filled}
          onChangeAsync={async (on) => setStyle({ ...style, filled: on })}
        />
      </Row>
    </>
  );
}
