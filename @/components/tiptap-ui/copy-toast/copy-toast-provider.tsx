// toast-context.tsx
import { useState, useCallback, useRef } from "react";
import { CopyToast } from "./copy-toast";

import { ToastContext } from "./copy-toast-context";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2000);
  }, []);

  return (
    <ToastContext.Provider value={{ visible, show }}>
      {children}
      <CopyToast visible={visible} /> {/* render here, once, at the top */}
    </ToastContext.Provider>
  );
}
