// Shared shape for every Generic* input. Designed to be drop-in for
// react-hook-form's Controller (just pass field.value / field.onChange) AND
// standalone (use the parent component's local state).
export interface BaseInputProps<T> {
  name: string;
  title?: string;
  value: T;
  onChange: (value: T) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}
