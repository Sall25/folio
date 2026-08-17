import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { useTocActions, useTocContent, useTocUIState } from "./toc-context";

const widths: Record<number, string> = {
  1: "16px",
  2: "11px",
  3: "8px",
  4: "5px",
  5: "3px",
  6: "1px",
};

export function TocProgress({ maxShowCount = 20 }: { maxShowCount?: number }) {
  const { showTocContent } = useTocActions();
  const { tocContent } = useTocContent();
  const { activeId, open } = useTocUIState();

  const items = tocContent.slice(0, maxShowCount);
  const activeIndex = items.findIndex((i) => i.id === activeId) ?? 0;

  return (
    <CardItemGroup
      orientation="vertical"
      className="toc-progress"
      onMouseOver={() => showTocContent()}
      style={{
        display: `${open ? "none" : "flex"}`,
      }}
    >
      {items.map((item, index) => (
        <span
          key={index}
          className={`toc-progress-line ${activeIndex === index ? "active" : ""}`}
          style={{
            width: `${widths[item.level]}`,
          }}
        />
      ))}
    </CardItemGroup>
  );
}
