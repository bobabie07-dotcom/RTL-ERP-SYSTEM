import * as React from 'react';

/**
 * Labeled text input with optional icon, trailing node, and error state.
 *
 * @startingPoint section="Forms" subtitle="Text field — icon, focus ring, error" viewport="700x200"
 */
export interface InputProps {
  label?: string;
  /** @default "text" */
  type?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Leading icon node (Lucide SVG). */
  icon?: React.ReactNode;
  /** Trailing node — e.g. a password reveal IconButton. */
  trailing?: React.ReactNode;
  /** Error message; turns the field red. */
  error?: string;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

export function Input(props: InputProps): JSX.Element;
