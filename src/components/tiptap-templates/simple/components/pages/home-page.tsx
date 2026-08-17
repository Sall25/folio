import { useLayoutMode } from "../../hooks/use-layout-mode";
import { HomePageContent } from "../home-page-content";
import { memo } from "react";

function HomePageImpl() {
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
      <HomePageContent />
    </div>
  );
}

export const HomePage = memo(HomePageImpl);
