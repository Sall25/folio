import { useState } from "react";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { CoverTabs } from "./cover-tabs";
import { GradientTab } from "./gradient-tab";
import { RepositionTab } from "./reposition-tab";
import { UnsplashTab } from "./unsplash-tab";
import { UrlTab } from "./url-tab";
import type { CoverTab } from "./types";

export interface CoverPickerCardProps {
  /** Current cover image URL (if any) */
  coverImage?: string | null;
  /** Current vertical position 0–100 (default 50) */
  positionY?: number;
  /** Called when user picks an Unsplash photo or URL — pass the new image URL */
  onCoverImageChange: (url: string) => void;
  /** Called when user drags to reposition */
  onPositionChange: (y: number) => void;
  /** Called when user picks a gradient — pass the CSS gradient string */
  onGradientChange: (gradient: string) => void;

  handlePositionDragEndAsync?: () => Promise<void>;
}

export function CoverPickerCard({
  coverImage,
  positionY = 50,
  onCoverImageChange,
  onPositionChange,
  onGradientChange,
  handlePositionDragEndAsync,
}: CoverPickerCardProps) {
  const hasCoverImage = !!coverImage;

  // Default to "reposition" only if there's already a cover image, otherwise "unsplash"
  const [activeTab, setActiveTab] = useState<CoverTab>(
    hasCoverImage ? "reposition" : "unsplash",
  );

  const [selectedGradient, setSelectedGradient] = useState<string | null>(null);

  const handleGradientSelect = (gradient: string) => {
    setSelectedGradient(gradient);
    onGradientChange(gradient);
  };

  return (
    <Card style={{ padding: "5px 15px", width: 460, overflow: "hidden" }}>
      <CoverTabs active={activeTab} onActive={setActiveTab} />

      <div style={{ marginTop: 4, width: "100%" }}>
        {activeTab === "reposition" && (
          <>
            {hasCoverImage ? (
              <RepositionTab
                coverImage={coverImage!}
                positionY={positionY}
                onPositionChange={onPositionChange}
                onDragEnd={handlePositionDragEndAsync}
              />
            ) : (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--tt-text-color)",
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                No cover image yet. Pick one from Unsplash or a URL.
              </p>
            )}
          </>
        )}

        {activeTab === "unsplash" && (
          <UnsplashTab
            onSelect={(url) => {
              onCoverImageChange(url);
              setActiveTab("reposition");
            }}
          />
        )}

        {activeTab === "gradient" && (
          <GradientTab
            selected={selectedGradient}
            onSelect={handleGradientSelect}
          />
        )}

        {activeTab === "url" && (
          <UrlTab
            onSelect={(url) => {
              onCoverImageChange(url);
              setActiveTab("reposition");
            }}
          />
        )}
      </div>
    </Card>
  );
}
