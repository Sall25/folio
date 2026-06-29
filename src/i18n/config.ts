import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en/common.json";
import fr from "./locales/fr/common.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      fr: { common: fr },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    defaultNS: "common",
    ns: ["common"],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      // detect from saved choice first, then the browser
      order: ["localStorage", "navigator"],
      // keep it in your existing folio: namespace
      lookupLocalStorage: "folio:language",
      caches: ["localStorage"],
    },
    react: {
      // resources are bundled inline, so no async load / Suspense needed
      useSuspense: false,
    },
  });

// ── dev-only: flag French values left identical to English ──
if (import.meta.env.DEV) {
  const flat = (o: Record<string, unknown>, p = ""): [string, unknown][] =>
    Object.entries(o).flatMap(([k, v]) =>
      v && typeof v === "object"
        ? flat(v as Record<string, unknown>, p + k + ".")
        : [[p + k, v]],
    );
  const flatEn = Object.fromEntries(flat(en));
  const flatFr = Object.fromEntries(flat(fr));
  const same = Object.keys(flatEn).filter((k) => flatEn[k] === flatFr[k]);
  if (same.length) console.warn("[i18n] identical EN/FR values:", same);
}

export default i18n;
