The dashboard's KPI tile — the most-used data component. Lay them out in a 4-up grid.

```jsx
<StatCard label="Total Birds" value="48,250" icon={<BirdIcon/>} delta="5.6%" deltaDir="up" />
<StatCard label="Mortality Rate" value="4.21%" tone="red" icon={<HeartPulseIcon/>}
  delta="0.6%" deltaDir="down" deltaGood />
<StatCard label="Revenue (₱)" value="₱6,780,000" icon={<TrendingUpIcon/>} delta="12.4%" />
```

- `tone` only colors the icon circle — keep most green; use red/amber for risk metrics.
- Delta color is semantic, not directional: set `deltaGood` when a down-arrow is the win
  (mortality, expenses). Default: up = good.
- Values use thousands separators and the ₱ glyph; figures render tabular.
