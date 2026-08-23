import { Button } from "src/components/tiptap-ui-primitive/button";

export function RepositionButton({
  repositioning,
  onReposition,
}: {
  repositioning?: boolean;
  onReposition: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className="db-card-controls__btn"
      data-active-state={repositioning ? "on" : undefined}
      onClick={(e) => {
        e.stopPropagation();
        onReposition();
      }}
    >
      <span className="tiptap-button-text">
        {repositioning ? "Done" : "Reposition"}
      </span>
    </Button>
  );
}
