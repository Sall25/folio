import { ArrowDownUp, Check, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

export type SortType = "Manual" | "Alphabetical" | "Reverse alphabetical";

interface SortDropdownProps {
  onSelect: (sort: SortType) => void;
  hideWhenUnavailable?: boolean;
  sort?: SortType;
}

export function SortDropdown({
  onSelect,
  /*hideWhenUnavailable,*/
  sort: providedSort,
}: SortDropdownProps) {
  const [sort, setSort] = useState<SortType>(providedSort ?? "Manual");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" style={{ minWidth: 210 }}>
          <ArrowDownUp className="tiptap-button-icon" data-size="large" />
          <span className="tiptap-button-text">Sort</span>
          <Spacer orientation="horizontal" />

          <span style={{ display: "flex", alignItems: "center" }}>
            <span className="tiptap-button-text" style={{ opacity: 0.8 }}>
              {sort}
            </span>
            <ChevronRight className="tiptap-button-icon-sub" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start">
        <Card style={{ minWidth: 230, padding: 4 }}>
          <CardItemGroup
            style={{
              width: "100%",
              justifyContent: "flex-start",
              alignItems: "flex-start",
            }}
          >
            {(
              ["Manual", "Alphabetical", "Reverse alphabetical"] as SortType[]
            ).map((s) => (
              <Button
                key={s}
                variant="ghost"
                onClick={() => {
                  setSort(s);
                  onSelect?.(s);
                }}
                style={{ width: "100%" }}
              >
                <span className="tiptap-button-text">{s}</span>
                {s === sort && (
                  <>
                    <Spacer orientation="horizontal" />
                    <Check className="tiptap-button-icon" data-size="large" />
                  </>
                )}
              </Button>
            ))}
          </CardItemGroup>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
