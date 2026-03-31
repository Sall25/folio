import { useContext } from "react";
import { ToastContext } from "@/components/tiptap-ui/copy-toast";

export const useCopyToast = () => useContext(ToastContext);
