import * as React from 'react';

/** App header bar — menu toggle, page title, right-aligned actions (date, alerts, account). */
export interface TopbarProps {
  title?: React.ReactNode;
  /** Show hamburger toggle; called on click. */
  onMenu?: () => void;
  /** Extra nodes after the title (breadcrumb, search). */
  left?: React.ReactNode;
  /** Right-aligned actions: date Select, notification IconButtons, Avatar. */
  right?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Topbar(props: TopbarProps): JSX.Element;
