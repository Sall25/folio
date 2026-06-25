import type { Page } from "src/types";
import type { Editor } from "@tiptap/react";
import { useTemplates } from "src/hooks/use-templates";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage as patchPageApi } from "src/api/pages";
import { PageItemIcon } from "../../page-item-icon";
import { FileText } from "lucide-react";
import "./template-choice-panel.scss";

// Shown on an empty page. Mirrors RecordPropertyPanel: takes `page`, self-contained
// hooks, patches via usePatchPage. Picking a template fills THIS page rather than
// creating a new one. The target editor is passed in explicitly, because callers
// like PageCenterView run their own useEditor instance (not the main one).
export function TemplateChoicePanel({
  page,
  editor,
  onDismiss,
}: {
  page: Page;
  editor: Editor | null;
  onDismiss?: () => void;
}) {
  const { data: templates } = useTemplates();
  const patchPage = usePatchPage(({ id, patch }) => patchPageApi(id, patch));

  const applyTemplate = (template: Page) => {
    const cover = structuredClone(template.cover);
    const settings = { ...template.settings };

    if (editor) {
      // Content → live editor doc so the open page updates now; emitUpdate fires
      // your update handler so the debounced save persists it.
      editor.commands.setContent(structuredClone(template.content), {
        emitUpdate: true,
      });
      patchPage.mutate({ id: page.id, patch: { cover, settings } });
    } else {
      // Fallback when no editor is available.
      patchPage.mutate({
        id: page.id,
        patch: { content: structuredClone(template.content), cover, settings },
      });
    }
    onDismiss?.();
  };

  return (
    <div className="template-choice-panel" contentEditable={false}>
      <div className="template-choice-panel__label">Start with</div>

      <button
        type="button"
        className="template-choice-panel__row"
        onClick={() => onDismiss?.()}
      >
        <span className="template-choice-panel__icon">
          <FileText size={16} />
        </span>
        <span className="template-choice-panel__name">Blank page</span>
      </button>

      {(templates ?? []).map((template) => (
        <button
          key={template.id}
          type="button"
          className="template-choice-panel__row"
          onClick={() => applyTemplate(template)}
        >
          <span className="template-choice-panel__icon">
            <PageItemIcon cover={template.cover} />
          </span>
          <span className="template-choice-panel__name">
            {template.title || "Untitled"}
          </span>
        </button>
      ))}
    </div>
  );
}
