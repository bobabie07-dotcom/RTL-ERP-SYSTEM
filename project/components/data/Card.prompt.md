Generic content surface for charts, tables, and panels — white, rounded, bordered + soft shadow.

```jsx
<Card title="Mortality Trend (%)" action={<Select options={['Last 7 days']} />}>
  <Chart/>
</Card>
```

- Header divider only appears when `title` or `action` is set.
- Compose StatCard for KPIs instead of building metric cards by hand.
