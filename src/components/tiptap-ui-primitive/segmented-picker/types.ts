export interface SegmentedPickerOption<T extends string> {
  id: T;
  label: string;
  icon: React.ReactNode;
}

export interface SegmentedPickerProps<T extends string> {
  options: SegmentedPickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
}
