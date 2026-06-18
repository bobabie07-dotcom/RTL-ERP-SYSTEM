Primary call-to-action button — use for the main action on a screen ("Login", "Add Item", "Generate Report"); secondary/ghost for lower-emphasis actions, danger for destructive ones.

```jsx
<Button variant="primary" size="lg" fullWidth>Login</Button>
<Button variant="secondary" icon={<PlusIcon/>}>Add Item</Button>
<Button variant="ghost" size="sm">Cancel</Button>
<Button variant="danger">Delete</Button>
```

- Green `primary` is the only filled-green CTA per view — keep it singular.
- `secondary` is the white outlined button (dropdowns, "Sign in with Google", toolbar actions).
- `ghost` for tertiary/inline actions; `danger` for delete/destructive.
- Pass icons as React nodes via `icon` / `trailingIcon` (Lucide SVGs match the brand).
