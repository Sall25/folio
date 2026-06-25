import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { LayoutTemplate, FileText } from "lucide-react";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";

// When converting a template back to a page we don't know its original
// category (it wasn't stored), so fall back to Private.
const DEFAULT_PAGE_CATEGORY = "Private";

export function PageTemplateMenu() {
  const { activePage } = useActivePage();
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));

  if (!activePage) return null;

  const isTemplate = activePage.category === "Template";

  const toggle = async () => {
    await mutateAsync({
      id: activePage.id,
      patch: { category: isTemplate ? DEFAULT_PAGE_CATEGORY : "Template" },
    });
  };

  return (
    <ButtonGroup style={{ minWidth: 180 }} orientation="vertical">
      <Button
        variant="ghost"
        style={{ width: "100%", justifyContent: "flex-start", gap: 10 }}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
      >
        {isTemplate ? (
          <FileText className="tiptap-button-icon" />
        ) : (
          <LayoutTemplate className="tiptap-button-icon" />
        )}
        <span>{isTemplate ? "Turn into page" : "Turn into template"}</span>
      </Button>
    </ButtonGroup>
  );
}
