List table for batches / inventory / transactions. Define columns with optional `render` for badges, currency, and row actions.

```jsx
<DataTable
  columns={[
    { key: 'batch', header: 'Batch No.', strong: true },
    { key: 'farm', header: 'Farm' },
    { key: 'mortality', header: 'Mortality %', align: 'right', numeric: true },
    { key: 'status', header: 'Status', render: r => <Badge tone="success">{r.status}</Badge> },
  ]}
  rows={batches}
  rowKey="batch"
/>
```

- Use `strong` for the identifier column, `numeric` for figures (tabular alignment), `align:'right'` for numbers/currency.
