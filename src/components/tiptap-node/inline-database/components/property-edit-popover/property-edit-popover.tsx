import { ChevronRight, Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

export function PropertyEditPopover({ children }: { children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost">
          <Settings2 className="tiptap-button-icon" />
          <span className="tiptap-button-text">Edit property</span>
          <Spacer />
          <ChevronRight className="tiptap-button-sub" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="center">
        <Card>{children}</Card>
      </PopoverContent>
    </Popover>
  );
}
