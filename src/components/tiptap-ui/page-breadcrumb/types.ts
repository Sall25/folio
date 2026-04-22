export interface BreadcrumbItem {
  label: string;
  icon?: React.ReactNode;
  locked?: boolean;
  onClick?: () => void;
}

export interface PageBreadcrumbProps {
  items: BreadcrumbItem[];
}
