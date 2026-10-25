import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, ExternalLink, Globe } from "src/components/icons";
import type { Page } from "src/types";
import { useToast } from "src/features/shell/toast";
import { publishedPageUrl, usePublishPage } from "src/hooks/use-publish-page";

// The share panel's Publish tab: put the page on the web (anyone with the
// link, no account), optionally with its subpages. Visitors always see the
// latest saved version. Only people with full access can change it; others
// see the link when the page is already published.
export function PublishTab({
  page,
  canManage,
}: {
  page: Page;
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const { show } = useToast();
  const publish = usePublishPage(page.id);
  const isPublished = !!page.publishedAt;
  const [includeSubpages, setIncludeSubpages] = useState(
    page.publishSubpages ?? false,
  );
  const url = publishedPageUrl(page.id);
  const busy = publish.isPending;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      show(t("share.linkCopied"), "success");
    } catch {
      show(url, "info"); // clipboard refused — at least show the address
    }
  };

  if (!isPublished) {
    return (
      <div className="publish-tab">
        <div className="publish-tab__intro">
          <span className="publish-tab__badge" aria-hidden>
            <Globe size={18} />
          </span>
          <span className="publish-tab__intro-text">
            <span className="publish-tab__title">{t("publish.title")}</span>
            <span className="publish-tab__desc">
              {t("publish.description")}
            </span>
          </span>
        </div>

        {canManage ? (
          <>
            <label className="publish-tab__option">
              <input
                type="checkbox"
                checked={includeSubpages}
                onChange={(e) => setIncludeSubpages(e.target.checked)}
              />
              <span className="publish-tab__option-text">
                <span>{t("publish.includeSubpages")}</span>
                <span className="publish-tab__hint">
                  {t("publish.includeSubpagesHint")}
                </span>
              </span>
            </label>
            <div className="publish-tab__actions">
              <button
                type="button"
                className="publish-tab__primary"
                disabled={busy}
                onClick={() =>
                  publish.mutate({ published: true, includeSubpages })
                }
              >
                {busy ? t("publish.publishing") : t("publish.publish")}
              </button>
            </div>
          </>
        ) : (
          <p className="publish-tab__note">{t("publish.fullAccessOnly")}</p>
        )}
      </div>
    );
  }

  return (
    <div className="publish-tab">
      <div className="publish-tab__status">
        <span className="publish-tab__live" aria-hidden />
        <span className="publish-tab__intro-text">
          <span className="publish-tab__title">{t("publish.live")}</span>
          <span className="publish-tab__desc">
            {page.publishSubpages
              ? t("publish.liveWithSubpages")
              : t("publish.liveDescription")}
          </span>
        </span>
      </div>

      <div className="publish-tab__link">
        <input
          className="publish-tab__url"
          value={url}
          readOnly
          aria-label={t("publish.link")}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          className="publish-tab__icon-btn"
          aria-label={t("share.copyLink")}
          title={t("share.copyLink")}
          onClick={copy}
        >
          <Copy size={15} />
        </button>
        <a
          className="publish-tab__icon-btn"
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label={t("publish.open")}
          title={t("publish.open")}
        >
          <ExternalLink size={15} />
        </a>
      </div>

      {canManage ? (
        <>
          <label className="publish-tab__option">
            <input
              type="checkbox"
              checked={page.publishSubpages ?? false}
              disabled={busy}
              onChange={(e) => {
                setIncludeSubpages(e.target.checked);
                publish.mutate({
                  published: true,
                  includeSubpages: e.target.checked,
                });
              }}
            />
            <span className="publish-tab__option-text">
              <span>{t("publish.includeSubpages")}</span>
              <span className="publish-tab__hint">
                {t("publish.includeSubpagesHint")}
              </span>
            </span>
          </label>
          <div className="publish-tab__actions">
            <button
              type="button"
              className="publish-tab__danger"
              disabled={busy}
              onClick={() => publish.mutate({ published: false })}
            >
              {t("publish.unpublish")}
            </button>
          </div>
        </>
      ) : (
        <p className="publish-tab__note">{t("publish.fullAccessOnly")}</p>
      )}
    </div>
  );
}
