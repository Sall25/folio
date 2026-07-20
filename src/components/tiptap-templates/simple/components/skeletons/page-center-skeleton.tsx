import { Bone } from "src/components/tiptap-ui-primitive/bone/bone";
import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import "./page-center-skeleton.scss";

/**
 * Placeholder for PageCenterView while the page loads and the editor boots.
 *
 * Mirrors the real modal's shell exactly — same Card, same toolbar row, same
 * body padding — so the swap to real content doesn't shift anything. Only the
 * contents are bones.
 */
export function PageCenterSkeleton({
  onClose,
  /** Whether the page has a cover — omit the band when it doesn't. */
  hasCover = true,
  lines = 6,
}: {
  onClose?: () => void;
  hasCover?: boolean;
  lines?: number;
}) {
  return (
    <>
      <div
        className="page-create-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <Card
        className="page-create-modal page-skeleton"
        aria-busy="true"
        aria-label="Loading page"
      >
        {/* Toolbar — same right-aligned button cluster as the real view */}
        <CardItemGroup
          orientation="horizontal"
          style={{ width: "100%", justifyContent: "flex-start" }}
        >
          <Spacer orientation="horizontal" />
          <CardItemGroup orientation="horizontal">
            <Bone width={28} height={28} rounded />
            <Bone width={28} height={28} rounded />
          </CardItemGroup>
        </CardItemGroup>

        <CardBody style={{ width: "100%" }}>
          {hasCover && (
            <Bone width="100%" height={140} className="page-skeleton__cover" />
          )}

          {/* Page icon — overlaps the cover's lower edge, as CoverHeader does */}
          <div className="page-skeleton__icon">
            <Bone width={56} height={56} rounded />
          </div>

          {/* Title */}
          <div className="page-skeleton__title">
            <Bone width="55%" height={34} rounded />
          </div>

          {/* Body paragraphs — varied widths so it reads as prose, with a
              deterministic pattern rather than random (which flickers). */}
          <div className="page-skeleton__body">
            {Array.from({ length: lines }).map((_, i) => (
              <Bone
                key={i}
                width={`${[92, 78, 85, 60, 88, 71, 95, 54][i % 8]}%`}
                height={14}
              />
            ))}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
