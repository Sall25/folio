import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { SuggestionKeyDownProps } from "@tiptap/suggestion";
import type { MentionListProps } from "./types";
import type { MentionListRef } from "./types";
import { Card, CardGroupLabel } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";

import "./mention-list.scss";
import { AlarmClock, Clock, Users } from "lucide-react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import { Separator } from "src/components/tiptap-ui-primitive/separator";

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [menuVisible, setMenuVisible] = useState(false);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) command(item);
    };

    const upHandler = () => {
      setSelectedIndex((i) => (i + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((i) => (i + 1) % items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    // useEffect(() => setSelectedIndex(0), [items])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }
        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }
        if (event.key === "Enter") {
          enterHandler();
          return true;
        }
        return false;
      },
    }));

    useEffect(() => {
      const raf = requestAnimationFrame(() => {
        setMenuVisible(true);
      });
      return () => cancelAnimationFrame(raf);
    }, []);

    return (
      <Card className="mention-menu" data-mention-menu-open={menuVisible}>
        {items.length === 0 && <CardGroupLabel>No results</CardGroupLabel>}

        {items.map((item, index) => (
          <div key={index} style={{ display: "contents" }}>
            {item.title && (
              <>
                <CardGroupLabel className="mention-title">
                  {item.title === "Date" ? <AlarmClock /> : <Users />}
                  <span>{item.title}</span>
                </CardGroupLabel>
                <Separator orientation="horizontal" />
              </>
            )}
            {item.date && (
              <Button
                className="mention-item"
                data-active-state={index === selectedIndex}
                variant="ghost"
                onClick={() => selectItem(index)}
              >
                <Clock className="tiptap-button-icon" />
                <span> {item.date}</span>
              </Button>
            )}
            {!item.title && !item.date && (
              <Button
                className="mention-item"
                data-highlighted={index === selectedIndex}
                onClick={() => selectItem(index)}
              >
                <img
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "100%",
                  }}
                  src={item.avatar}
                  alt="profile"
                />
                <CardGroupLabel>{item.label}</CardGroupLabel>

                <Spacer orientation="horizontal" />
                <Badge>{item.role}</Badge>
              </Button>
            )}
          </div>
        ))}
      </Card>
    );
  },
);

MentionList.displayName = "MentionList";
export default MentionList;
