interface CalendarTimeInputProps {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}

export function CalendarTimeInput({
  value,
  onChange,
  onBlur,
}: CalendarTimeInputProps) {
  return (
    <div className="cv-time">
      <input
        type="text"
        className="cv-time__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") onBlur();
        }}
        placeholder="e.g. 2:30 PM"
      />
    </div>
  );
}
