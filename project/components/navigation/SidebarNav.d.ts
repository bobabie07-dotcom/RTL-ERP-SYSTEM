import * as React from 'react';

export interface SidebarNavItem {
  key: string;
  label: string;
  /** Icon node (Lucide SVG). */
  icon?: React.ReactNode;
}

/**
 * Fixed dark-green app sidebar — brand lockup, nav list, footer slot.
 *
 * @startingPoint section="Navigation" subtitle="Dark-green ERP sidebar with active state" viewport="280x720"
 */
export interface SidebarNavProps {
  /** Brand lockup node rendered at the top. */
  brand?: React.ReactNode;
  items: SidebarNavItem[];
  /** Key of the active item. */
  active?: string;
  onSelect?: (key: string) => void;
  /** Footer node (farm selector / slogan). */
  footer?: React.ReactNode;
  /** @default 260 */
  width?: number;
  style?: React.CSSProperties;
}

export function SidebarNav(props: SidebarNavProps): JSX.Element;
