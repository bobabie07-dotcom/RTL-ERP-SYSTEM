import * as React from 'react';

/** Square checkbox with green checked fill — "Remember me", row selection, form toggles. */
export interface CheckboxProps {
  label?: React.ReactNode;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

export function Checkbox(props: CheckboxProps): JSX.Element;
