import * as React from 'react';

export interface DataTableColumn {
  /** Unique cell key. */
  key: string;
  /** Header label. */
  header: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Bold + dark text (identifier columns). */
  strong?: boolean;
  /** Tabular figures (numeric columns). */
  numeric?: boolean;
  /** Custom cell renderer — receives the row; return a node (Badge, ₱ value, actions). */
  render?: (row: any) => React.ReactNode;
}

/** Clean list table for batches, inventory, and transactions. */
export interface DataTableProps {
  columns: DataTableColumn[];
  rows: any[];
  /** Field used as React key. @default "id" */
  rowKey?: string;
  style?: React.CSSProperties;
}

export function DataTable(props: DataTableProps): JSX.Element;
