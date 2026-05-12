import { ArrowDownUp, ChevronRight } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardHeader } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";

export function SelectPropertyEdit() {
  return (
    <Card>
      <CardHeader>
        <Popover>
          <PopoverTrigger asChild>
            <Button>
              <ArrowDownUp className="tiptap-button-icon" data-size="large" />
              <span className="tiptap-button-text">Sort</span>

              <ChevronRight className="tiptap-button-icon-sub" />
            </Button>
          </PopoverTrigger>
        </Popover>
      </CardHeader>
    </Card>
  );
}
