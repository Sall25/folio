
export type NavigationContextType = {
  showFloatingTOC: () => void;
  hideFloatingTOC: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}