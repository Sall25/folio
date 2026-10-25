import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { CloudUpload as UploadCloud } from "src/components/icons";
import { uploadFile } from "src/api/uploads";
import { usePages } from "src/hooks/use-pages";
import {
  WALLPAPER_PRESETS,
  imageLayer,
  lookFromCss,
  readLook,
  shrinkImage,
  useWallpaper,
  type Wallpaper,
  type WallpaperLook,
  type WallpaperSource,
} from "src/features/shell/appearance/wallpaper";
import "./wallpaper-settings.scss";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_COVERS = 12;

type Choice = { id: string; label: string; image: string };

// My settings › Appearance › Wallpaper: where the picture comes from (a
// preset, one of your pages' covers, or an upload), and how frosted, dimmed
// and opaque the glass is. Every change applies straight away.
export function WallpaperSettings() {
  const { t } = useTranslation();
  const [wallpaper, setWallpaper] = useWallpaper();
  const [tab, setTab] = useState<WallpaperSource>(wallpaper.source);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: pages = [] } = usePages();

  // Pages you can see that have a picture or gradient cover.
  const covers = useMemo<Choice[]>(
    () =>
      pages
        .filter((p) => p.cover?.coverImage || p.cover?.gradient)
        .slice(0, MAX_COVERS)
        .map((p) => ({
          id: p.id,
          label: p.title || t("page.untitled"),
          image: p.cover.coverImage
            ? imageLayer(p.cover.coverImage)
            : (p.cover.gradient as string),
        })),
    [pages, t],
  );

  const presets = useMemo<Choice[]>(
    () =>
      WALLPAPER_PRESETS.map((p) => ({
        id: p.id,
        label: t(`settings.wallpaper.preset.${p.id}`),
        image: p.image,
      })),
    [t],
  );

  const update = (patch: Partial<Wallpaper>) =>
    setWallpaper((prev) => ({ ...prev, ...patch }));

  // A new picture: work out its look, then save it all at once.
  const choose = async (
    source: WallpaperSource,
    ref: string,
    image: string,
    look: () => Promise<WallpaperLook> | WallpaperLook,
  ) => {
    setError(null);
    let next: WallpaperLook | null = null;
    try {
      next = await look();
    } catch {
      setError(t("settings.wallpaper.readFailed"));
    }
    update({ source, ref, image, ...(next ?? {}) });
  };

  const pickPreset = (choice: Choice) => {
    const preset = WALLPAPER_PRESETS.find((p) => p.id === choice.id);
    if (preset)
      void choose("preset", preset.id, preset.image, () => preset.look);
  };

  const pickCover = (choice: Choice) => {
    const page = pages.find((p) => p.id === choice.id);
    const url = page?.cover.coverImage;
    void choose("cover", choice.id, choice.image, () =>
      url ? readLook(url) : lookFromCss(choice.image),
    );
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("settings.wallpaper.notImage"));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(t("settings.wallpaper.tooBig"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const url = await uploadFile(await shrinkImage(file), "covers");
      await choose("upload", url, imageLayer(url), () => readLook(url));
    } catch {
      setError(t("settings.wallpaper.uploadFailed"));
    } finally {
      setBusy(false);
    }
  };

  const choices = tab === "cover" ? covers : presets;
  const pick = tab === "cover" ? pickCover : pickPreset;

  return (
    <div className="wp-settings">
      <div
        className="wp-settings__tabs"
        role="tablist"
        aria-label={t("settings.appearanceNames.wallpaper", "Wallpaper")}
      >
        {(["preset", "cover", "upload"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className="wp-settings__tab"
            onClick={() => setTab(id)}
          >
            {t(`settings.wallpaper.source.${id}`)}
          </button>
        ))}
      </div>

      {tab === "upload" ? (
        <button
          type="button"
          className="wp-settings__drop"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud size={24} aria-hidden="true" />
          <span className="wp-settings__drop-title">
            {busy
              ? t("settings.wallpaper.uploading")
              : t("settings.wallpaper.choose")}
          </span>
          <span className="wp-settings__drop-hint">
            {t("settings.wallpaper.formats")}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => void onFile(e)}
          />
        </button>
      ) : choices.length === 0 ? (
        <p className="wp-settings__empty">{t("settings.wallpaper.noCovers")}</p>
      ) : (
        <div className="wp-settings__grid">
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="wp-settings__thumb"
              aria-pressed={
                wallpaper.source === (tab === "cover" ? "cover" : "preset") &&
                wallpaper.ref === choice.id
              }
              onClick={() => pick(choice)}
            >
              <span
                className="wp-settings__thumb-image"
                style={{ background: choice.image }}
                aria-hidden="true"
              />
              <span className="wp-settings__thumb-label">{choice.label}</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="wp-settings__error" role="alert">
          {error}
        </p>
      )}

      <div className="wp-settings__sliders">
        <Slider
          label={t("settings.wallpaper.blur")}
          value={wallpaper.blur}
          min={0}
          max={40}
          unit="px"
          onChange={(blur) => update({ blur })}
        />
        <Slider
          label={t("settings.wallpaper.dim")}
          value={wallpaper.dim}
          min={0}
          max={60}
          unit="%"
          onChange={(dim) => update({ dim })}
        />
        <Slider
          label={t("settings.wallpaper.glass")}
          value={wallpaper.glass}
          min={30}
          max={90}
          unit="%"
          onChange={(glass) => update({ glass })}
        />
      </div>

      <div className="wp-settings__note">
        <span
          className="wp-settings__swatch"
          style={{ background: `rgb(${wallpaper.tint})` }}
          aria-hidden="true"
        />
        <span>
          {wallpaper.dark
            ? t("settings.wallpaper.darkNote")
            : t("settings.wallpaper.lightNote")}
        </span>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="wp-settings__slider">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="wp-settings__value">
        {value}
        {unit}
      </span>
    </label>
  );
}
