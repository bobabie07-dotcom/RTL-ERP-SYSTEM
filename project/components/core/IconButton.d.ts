import * as React from 'react';

/** Icon-only button for top bars and table-row actions. */
export interface IconButtonProps {
  /** Icon node (Lucide SVG). */
  children?: React.ReactNode;
  /** @default "default" */
  tone?: 'default' | 'brand' | 'danger';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Optional notification count badge (e.g. unread bell). */
  badge?: number | string | null;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

export function IconButton(props: IconButtonProps): JSX.Element;
