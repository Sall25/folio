import { useNavigate } from "@tanstack/react-location";
import { LibraryBig } from "lucide-react";
import { memo } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

export const LibraryPaletteTrigger = memo(() => {
  const navigate = useNavigate();
  const handleLibraryClick = () => {
    navigate({ to: "/library/Recents" });
  };

  return (
    <Button
      onClick={handleLibraryClick}
      size="large"
      variant="ghost"
      style={{ width: "100%", justifyContent: "flex-start" }}
    >
      <LibraryBig className="tiptap-button-icon" />
      <Spacer orientation="horizontal" size={2} />

      <span
        className="tiptap-button-text"
        style={{ opacity: 1, display: "block" }}
      >
        Library
      </span>
    </Button>
  );
});
LibraryPaletteTrigger.displayName = "LibraryPaletteTrigger";
