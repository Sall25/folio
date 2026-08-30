import "./spinner-ring.scss";

export function SpinnerRing({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`spinner-ring${className ? ` ${className}` : ""}`}
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
    />
  );
}
