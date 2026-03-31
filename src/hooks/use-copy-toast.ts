import { useContext } from "react";
import { ToastContext } from "src/components/tiptap-ui/copy-toast";

export const useCopyToast = () => useContext(ToastContext);
