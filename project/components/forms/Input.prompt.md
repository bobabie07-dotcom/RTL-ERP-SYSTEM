Labeled text field — the standard form input across the ERP (login, add-record forms).

```jsx
<Input label="Username" placeholder="Enter your username" icon={<UserIcon/>} />
<Input label="Password" type="password" icon={<LockIcon/>}
  trailing={<IconButton size="sm"><EyeIcon/></IconButton>} />
<Input label="Cost per Chick (₱)" error="Required" />
```

- Focus greens the border and adds a soft ring; `error` turns it red with a message line.
- Pair leading `icon` with the field meaning (user, lock, search, calendar).
