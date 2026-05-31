import "./logo.scss";

interface LogoProps {
  collapsed: boolean;
}

export function Logo({ collapsed }: LogoProps) {
  return (
    <div className={`logo${collapsed ? " logo--collapsed" : ""}`}>
      {!collapsed && (
        <div className="logo__wordmark">
          <span className="logo__name">Folio</span>
        </div>
      )}
    </div>
  );
}
