import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, Link } from "src/components/icons";
import {
  DEFAULT_CONFIGS,
  type DatabaseProperty,
  type FormView,
} from "src/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { useToast } from "src/features/shell/toast";
import { formUrl } from "src/api/forms";
import { useDatabaseContext } from "../../context/database-context";
import { useDataSource } from "../../hooks/use-data-source";
import { MenuRow } from "../../components/menu-row";
import { FormSettings } from "./form-settings";
import { FormPreview } from "./form-preview";
import "./form-share.scss";

const recordsWho = (p: DatabaseProperty) =>
  p.config.type === "person" && p.config.default === "me";

/** On a form builder's toolbar: Preview (the form as people see it) and
 *  Share form (who can fill it in, anonymous answers, the link). */
export function FormToolbarActions({ view }: { view: FormView }) {
  const { t } = useTranslation();
  const { show } = useToast();
  const { db, source, attrs } = useDatabaseContext();
  const { updatePropertiesAsync, registerViewsAsync } = useDataSource(
    source?.id,
  );
  const [previewing, setPreviewing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const locked = !!attrs.locked;

  const properties = source?.properties ?? [];
  // Anonymous: no property records who answered (a Person set to "Me").
  const anonymous = !properties.some(recordsWho);
  const setAnonymous = (on: boolean) => {
    if (on) {
      void updatePropertiesAsync(
        properties.map((p) =>
          recordsWho(p) && p.config.type === "person"
            ? { ...p, config: { ...p.config, default: "no-default" } }
            : p,
        ),
      );
      return;
    }
    const respondent: DatabaseProperty = {
      id: crypto.randomUUID(),
      name: t("database.form.respondent"),
      config: { ...structuredClone(DEFAULT_CONFIGS.person), default: "me" },
      width: 180,
    };
    void updatePropertiesAsync([...properties, respondent]);
  };

  const url = source ? formUrl(source.id, view.id) : "";
  // The fill page reads the saved copy of the view: save it first.
  const saveView = () => registerViewsAsync([view]).catch(() => {});

  const copy = async () => {
    await saveView();
    navigator.clipboard
      .writeText(url)
      .then(() => show(t("database.form.linkCopied"), "success"))
      .catch(() => show(url, "info"));
  };

  return (
    <>
      <Button
        variant="ghost"
        size="small"
        className="form-toolbar__preview"
        disabled={!source}
        onClick={async () => {
          await saveView();
          setPreviewing(true);
        }}
      >
        <Eye className="tiptap-button-icon" size={14} />
        <span className="tiptap-button-text">{t("database.form.preview")}</span>
      </Button>

      <Popover open={shareOpen} onOpenChange={setShareOpen}>
        <PopoverTrigger asChild>
          <Button variant="primary" size="small" disabled={!source}>
            <span className="tiptap-button-text">
              {t("database.form.shareForm")}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" className="db-panel">
          <Card className="form-share">
            {!locked && (
              <>
                <FormSettings view={view} db={db} section="who" />
                <MenuRow
                  label={t("database.form.anonymous")}
                  toggle
                  checked={anonymous}
                  onToggle={() => setAnonymous(!anonymous)}
                />
                <span className="form-share__note">
                  {anonymous
                    ? t("database.form.anonymousOn")
                    : t("database.form.anonymousOff")}
                </span>
              </>
            )}
            <div className="form-share__link">
              <input
                className="form-share__url"
                readOnly
                value={url}
                aria-label={t("database.form.formLink")}
                onFocus={(e) => e.currentTarget.select()}
                onKeyDownCapture={(e) => e.stopPropagation()}
              />
              <Button variant="ghost" size="small" onClick={() => void copy()}>
                <Link className="tiptap-button-icon" size={14} />
                <span className="tiptap-button-text">
                  {t("database.form.copyFormLink")}
                </span>
              </Button>
            </div>
          </Card>
        </PopoverContent>
      </Popover>

      {previewing && source && (
        <FormPreview
          sourceId={source.id}
          viewId={view.id}
          onClose={() => setPreviewing(false)}
        />
      )}
    </>
  );
}
