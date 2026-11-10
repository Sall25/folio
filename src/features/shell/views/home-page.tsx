import { useCurrentPerson } from "src/hooks/use-session";
import { useLayoutMode } from "../hooks/use-layout-mode";
import { HomePageContent } from "../../home/home-page-content";
import { DesktopHome } from "../../home/desktop-home/desktop-home";
import { isDesktopApp } from "src/lib/desktop";
import { memo } from "react";

function HomePageImpl() {
  const { isMobile } = useLayoutMode();
  const { person } = useCurrentPerson();
  // The desktop app: Home as a launcher, sized to the window (no minimum
  // width: it rearranges itself instead).
  if (isDesktopApp && !isMobile) {
    return (
      <div
        style={{
          width: "100%",
          maxHeight: "var(--app-vh, 100vh)",
          overflowY: "auto",
          marginTop: 40,
        }}
      >
        <DesktopHome />
      </div>
    );
  }
  return (
    <div
      style={{
        width: "100%",
        maxHeight: "var(--app-vh, 100vh)",
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
