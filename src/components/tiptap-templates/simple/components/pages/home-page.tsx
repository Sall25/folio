import { useCurrentPerson } from "src/hooks/use-session";
import { useLayoutMode } from "../../hooks/use-layout-mode";
import { HomePageContent } from "../home-page-content";
import { memo } from "react";

function HomePageImpl() {
  const { isMobile } = useLayoutMode();
  const { person } = useCurrentPerson();
  return (
    <div
      style={{
        width: "100%",
        maxHeight: "100vh",
        minWidth: isMobile ? "auto" : 950,
        padding: isMobile ? "1rem 1rem 30vh" : "1rem 1.5rem 30vh",
        overflowY: "auto",
        marginTop: 40,
      }}
    >
      <HomePageContent userName={person?.name} />
    </div>
  );
}

export const HomePage = memo(HomePageImpl);
