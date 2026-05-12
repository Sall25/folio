import { Check } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardItemGroup,
  CardGroupLabel,
} from "src/components/tiptap-ui-primitive/card";

interface OptionItem<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface PropertyOptionPanelProps<T extends string> {
  label: string;
  options: OptionItem<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function PropertyOptionPanel<T extends string>({
  label,
  options,
  value,
  onChange,
}: PropertyOptionPanelProps<T>) {
  return (
    <Card>
      <CardBody style={{ minWidth: 240 }}>
        <CardItemGroup>
          <CardGroupLabel>{label}</CardGroupLabel>
          {options.map((opt) => (
            <Button
              key={opt.value}
              variant="ghost"
              style={{
                width: "100%",
                height: "auto",
                minHeight: 32,
                justifyContent: "flex-start",
                gap: 10,
                paddingTop: 5,
                paddingBottom: 5,
              }}
              onClick={() => onChange(opt.value)}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {value === opt.value && (
                  <Check
                    style={{ width: 13, height: 13 }}
                    className="tiptap-button-icon"
                  />
                )}
              </span>

              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 13, lineHeight: "1.4" }}>
                  {opt.label}
                </span>
                {opt.description && (
                  <span
                    style={{
                      fontSize: 11,
                      lineHeight: "1.4",
                      color: "var(--tt-gray-light-a-400)",
                    }}
                    className="sp-sub-description"
                  >
                    {opt.description}
                  </span>
                )}
              </span>
            </Button>
          ))}
        </CardItemGroup>
      </CardBody>
    </Card>
  );
}
