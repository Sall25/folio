import "./bone.scss";

interface BoneProps {
  width: number | string;
  height: number | string;
  circle?: boolean;
  pill?: boolean;
  rounded?: boolean;
  style?: React.CSSProperties;
}

export const Bone: React.FC<BoneProps & { className?: string }> = ({
  width,
  height,
  circle,
  pill,
  rounded,
  style,
  className,
}) => {
  const cls = [
    "es-bone",
    circle ? "es-bone-circle" : "",
    pill ? "es-bone-pill" : "",
    rounded ? "es-bone-rounded" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span
      className={cls}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
};
