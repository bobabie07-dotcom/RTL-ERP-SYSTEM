import * as React from 'react';

/** White workspace surface with optional title row + right-aligned action. */
export interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned header node — a Select, link, or button. */
  action?: React.ReactNode;
  children?: React.ReactNode;
  /** Body padding in px. @default 24 */
  padding?: number;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}

export function Card(props: CardProps): JSX.Element;
