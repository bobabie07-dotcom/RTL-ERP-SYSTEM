import * as React from 'react';

/** Low-emphasis neutral label/chip — categories, filters, removable selections. */
export interface TagProps {
  children?: React.ReactNode;
  /** @default "neutral" */
  color?: 'neutral' | 'green';
  /** When provided, renders a dismiss ✕ that calls this. */
  onRemove?: () => void;
  style?: React.CSSProperties;
}

export function Tag(props: TagProps): JSX.Element;
