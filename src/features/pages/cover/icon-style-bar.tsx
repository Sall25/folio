import { useTranslation } from "react-i18next";
import {
  ICON_VARIANTS,
  ICON_WEIGHTS,
  type IconOverride,
  type IconVariant,
} from "src/components/icons/icon-style";
import "./icon-style-bar.scss";

// The icon picker's look controls: style, weight and fill for the icon about
// to be picked. "Default" leaves that part to the app's icon style (My
// settings), so the icon changes with it.

const WEIGHT_LABELS: Record<number, string> = {
  200: "iconStyle.thin",
  300: "iconStyle.light",
  400: "iconStyle.regular",
  600: "iconStyle.bold",
};

export function IconStyleBar({
  value,
  onChange,
}: {
  value: IconOverride;
  onChange: (next: IconOverride) => void;
}) {
  const { t } = useTranslation();
  const set = (patch: IconOverride) => onChange({ ...value, ...patch });
  const isDefault =
    value.variant === undefined &&
    value.weight === undefined &&
    value.filled === undefined;

  return (
    <div className="icon-style-bar">
      <select
        className="icon-style-bar__select"
        aria-label={t("iconStyle.style")}
        value={value.variant ?? ""}
        onChange={(e) =>
          set({ variant: (e.target.value || undefined) as IconVariant })
        }
      >
        <option value="">{t("iconStyle.defaultStyle")}</option>
        {ICON_VARIANTS.map((v) => (
          <option key={v} value={v}>
            {t(`iconStyle.${v}`)}
          </option>
        ))}
      </select>
      <select
        className="icon-style-bar__select"
        aria-label={t("iconStyle.weight")}
        value={value.weight ?? ""}
        onChange={(e) =>
          set({
            weight: e.target.value ? Number(e.target.value) : undefined,
          })
        }
      >
        <option value="">{t("iconStyle.defaultWeight")}</option>
        {ICON_WEIGHTS.map((w) => (
          <option key={w} value={w}>
            {t(WEIGHT_LABELS[w])}
          </option>
        ))}
      </select>
      <select
        className="icon-style-bar__select"
        aria-label={t("iconStyle.fill")}
        value={value.filled === undefined ? "" : value.filled ? "1" : "0"}
        onChange={(e) =>
          set({
            filled: e.target.value === "" ? undefined : e.target.value === "1",
          })
        }
      >
        <option value="">{t("iconStyle.defaultFill")}</option>
        <option value="1">{t("iconStyle.filled")}</option>
        <option value="0">{t("iconStyle.outlinedFill")}</option>
      </select>
      {!isDefault && (
        <button
          type="button"
          className="icon-style-bar__reset"
          onClick={() => onChange({})}
        >
          {t("iconStyle.reset")}
        </button>
      )}
    </div>
  );
}
