import * as React from 'react';

/** Circular percentage gauge — batch progress, survival rate. */
export interface ProgressRingProps {
  /** 0–100. */
  value?: number;
  /** Diameter px. @default 96 */
  size?: number;
  /** Ring stroke width px. @default 9 */
  thickness?: number;
  /** Progress color (CSS). @default green-500 */
  color?: string;
  /** Track color (CSS). @default gray-200 */
  track?: string;
  /** Caption under the percentage. */
  label?: string;
  style?: React.CSSProperties;
}

export function ProgressRing(props: ProgressRingProps): JSX.Element;
