import "./logo.scss";

interface LogoProps {
  collapsed: boolean;
}

export function Logo({ collapsed }: LogoProps) {
  return (
    <div className="logo">
      <div className="logo__mark">
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M4 2h10v2.5H6.5v3H13v2.5H6.5V16H4V2z" fill="white" />
        </svg>
      </div>

      {!collapsed && (
        <div className="logo__wordmark">
          <span className="logo__name">Folio</span>
          <span className="logo__sub">Workspace</span>
        </div>
      )}
    </div>
  );
}
