import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "src/i18n/config";
import "./language-settings-content.scss";

export function LanguageSettingsContent() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  // Current language, normalized to a supported code (i18n.language can be a
  // region variant like "en-US" before the detector settles).
  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ??
    SUPPORTED_LANGUAGES.find((l) => i18n.language?.startsWith(l.code)) ??
    SUPPORTED_LANGUAGES[0];

  const choose = (code: LanguageCode) => {
    // Detector persists to folio:language (caches: ["localStorage"]); with
    // useSuspense:false and both bundles inline, the swap is synchronous and
    // every useTranslation consumer re-renders — no reload, no loading state.
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="language-settings">
      <div className="ls-row">
        <div className="ls-row__text">
          <span className="ls-row__label">{t("language.title")}</span>
          <span className="ls-row__desc">{t("language.description")}</span>
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="ls-select">
              <span className="ls-select__value">{current.label}</span>
              <ChevronDown size={16} className="ls-select__chevron" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end">
            <Card style={{ padding: 4, minWidth: 200 }}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={`ls-option${lang.code === current.code ? " is-active" : ""}`}
                  onClick={() => choose(lang.code)}
                >
                  <span className="ls-option__label">{lang.label}</span>
                  {lang.code === current.code && (
                    <Check
                      size={15}
                      style={{ color: "var(--tt-brand-color-400)" }}
                    />
                  )}
                </button>
              ))}
            </Card>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
