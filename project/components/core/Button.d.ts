import * as React from 'react';

/**
 * Primary action button for RTL Poultry Farming ERP.
 *
 * @startingPoint section="Core" subtitle="Green CTA + secondary / ghost / danger variants" viewport="700x160"
 */
export interface ButtonProps {
  children?: React.ReactNode;
  /** Visual style. @default "primary" */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Leading icon node (e.g. a Lucide SVG). */
  icon?: React.ReactNode;
  /** Trailing icon node (e.g. a chevron). */
  trailingIcon?: React.ReactNode;
  disabled?: boolean;
  /** Stretch to container width. @default false */
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

export function Button(props: ButtonProps): JSX.Element;
