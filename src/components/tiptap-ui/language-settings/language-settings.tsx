import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "src/i18n/config";
import "./language-setting.scss";

export function LanguageSetting() {
  const { t, i18n } = useTranslation();
  const active = i18n.resolvedLanguage;

  return (
    <div className="language-setting">
      <div className="language-setting__header">
        <span className="language-setting__label">
          {t("settings.language")}
        </span>
        <span className="language-setting__hint">
          {t("settings.languageDescription")}
        </span>
      </div>

      <div className="language-setting__options" role="radiogroup">
        {SUPPORTED_LANGUAGES.map((lng) => (
          <button
            key={lng.code}
            type="button"
            role="radio"
            aria-checked={active === lng.code}
            className="language-setting__option"
            data-active={active === lng.code}
            onClick={() => i18n.changeLanguage(lng.code)}
          >
            {lng.label}
          </button>
        ))}
      </div>
    </div>
  );
}
