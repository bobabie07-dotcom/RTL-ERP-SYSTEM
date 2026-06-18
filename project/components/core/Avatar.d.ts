import * as React from 'react';

/** Circular user avatar with image-or-initials fallback and optional name/role caption. */
export interface AvatarProps {
  src?: string;
  name?: string;
  /** Caption shown under name when showText is true (e.g. "Farm Manager"). */
  role?: string;
  /** Pixel diameter. @default 36 */
  size?: number;
  /** Show name + role beside the circle (top-bar account block). @default false */
  showText?: boolean;
  style?: React.CSSProperties;
}

export function Avatar(props: AvatarProps): JSX.Element;
