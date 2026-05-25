import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import type { CoverTab } from "./types";

type CoverTabConfig = { id: CoverTab; label: string };

const COVER_TABS: CoverTabConfig[] = [
  { id: "reposition", label: "Reposition" },
  { id: "unsplash", label: "Unsplash" },
  { id: "gradient", label: "Gradient" },
  { id: "url", label: "URL" },
  { id: "upload", label: "Upload" },
];

export function CoverTabs({
  active,
  onActive,
}: {
  active: CoverTab;
  onActive: (tab: CoverTab) => void;
}) {
  return (
    <CardItemGroup style={{ width: "100%", margin: "10px 0" }}>
      <ButtonGroup orientation="horizontal">
        {COVER_TABS.map(({ id, label }) => (
          <Button
            key={id}
            variant="ghost"
            style={{
              borderBottom:
                active === id
                  ? "2px solid var(--tt-brand-color-500)"
                  : "2px solid transparent",
              borderRadius: 0,
            }}
            onClick={() => onActive(id)}
          >
            {label}
          </Button>
        ))}
      </ButtonGroup>
    </CardItemGroup>
  );
}
