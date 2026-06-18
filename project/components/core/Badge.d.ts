import * as React from 'react';

/**
 * Status pill — "Active", "In Stock", "Low Stock", "Approved", etc.
 *
 * @startingPoint section="Core" subtitle="Semantic status pills — soft / solid / dot" viewport="700x140"
 */
export interface BadgeProps {
  children?: React.ReactNode;
  /** Semantic tone. @default "success" */
  tone?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  /** @default "soft" */
  variant?: 'soft' | 'solid';
  /** Show a leading status dot. @default false */
  dot?: boolean;
  style?: React.CSSProperties;
}

export function Badge(props: BadgeProps): JSX.Element;
