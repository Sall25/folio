import { memo } from "react";
import { useLayoutMode } from "../../hooks/use-layout-mode";
import { LibraryPalette } from "../library-palette";

function LibraryPageImpl() {
  const { isMobile } = useLayoutMode();
  return (
    <div
      style={{
        width: "100%",
        minWidth: isMobile ? "auto" : 950,
        padding: isMobile ? "1rem 1rem 30vh" : "1rem 1.5rem 30vh",

        overflowY: "auto",
      }}
    >
      {" "}
      <LibraryPalette />
    </div>
  );
}

export const LibraryPage = memo(LibraryPageImpl);
