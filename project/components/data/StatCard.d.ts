import * as React from 'react';

/**
 * Signature KPI tile — label, big value, tinted icon circle, signed trend delta.
 *
 * @startingPoint section="Data" subtitle="Dashboard KPI tile with icon + trend delta" viewport="700x180"
 */
export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Icon node (Lucide SVG) shown in the tinted circle. */
  icon?: React.ReactNode;
  /** Icon-circle color. @default "green" */
  tone?: 'green' | 'red' | 'amber' | 'blue' | 'purple';
  /** Delta value, e.g. "5.6%". */
  delta?: string;
  /** Arrow direction. @default "up" */
  deltaDir?: 'up' | 'down';
  /** Force delta color good/bad regardless of arrow (mortality down = good). */
  deltaGood?: boolean;
  /** @default "vs last month" */
  caption?: string;
  style?: React.CSSProperties;
}

export function StatCard(props: StatCardProps): JSX.Element;
