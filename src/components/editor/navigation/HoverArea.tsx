
import { useContext } from "react";
import { NavigationContext } from "./navigationContext";
import { ProgressBar } from "./ProgressBar";
import { FloatingSections } from "./FloatingSections";

// Combined hover area
export function HoverArea() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("Must be inside NavigationProvider");

  const { editor, sections } = context;

  return (
    <div
      className="relative"
      onMouseEnter={context.showFloatingSections}
    >
      {/* show the small indicators only when not hovered*/}
      <ProgressBar editor={editor} sections={sections} />

      {/* Show the floating panel only when hovered */}
      <FloatingSections editor={editor} sections={sections} />
    </div>
  );
}