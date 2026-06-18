Status pill for record states and inventory levels — soft tinted by default.

```jsx
<Badge tone="success">Active</Badge>
<Badge tone="success" dot>In Stock</Badge>
<Badge tone="warning">Low Stock</Badge>
<Badge tone="danger" variant="solid">Critical</Badge>
<Badge tone="info">Vaccination Due</Badge>
```

- Map tone to meaning: success=active/in-stock/approved, warning=low-stock/pending, danger=critical/high-mortality, info=scheduled.
- Use `variant="solid"` sparingly for the most urgent emphasis.
