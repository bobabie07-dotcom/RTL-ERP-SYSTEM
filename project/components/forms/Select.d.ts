import * as React from 'react';

export interface SelectOption { value: string; label: string; }

/** Styled dropdown (wraps native select) — farm / date-range / category / status filters. */
export interface SelectProps {
  label?: string;
  /** String[] or {value,label}[]. */
  options?: Array<string | SelectOption>;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

export function Select(props: SelectProps): JSX.Element;
