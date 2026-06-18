Icon-only button for the top bar (bell, mail, calendar) and table-row actions (edit, view, delete) — pass a single icon node as children.

```jsx
<IconButton title="Notifications" badge={4}><BellIcon/></IconButton>
<IconButton tone="brand" title="Edit"><PencilIcon/></IconButton>
<IconButton tone="danger" title="Delete"><TrashIcon/></IconButton>
```

- `badge` shows a red count bubble (unread alerts).
- `tone="brand"` (green) for edit/primary row actions, `danger` for delete.
