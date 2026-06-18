App header bar above the content area — page title left, actions right.

```jsx
<Topbar
  title="Dashboard"
  onMenu={toggleSidebar}
  right={<>
    <IconButton badge={4}><BellIcon/></IconButton>
    <Select options={['May 12, 2025']} />
    <Avatar name="Admin User" role="Farm Manager" showText />
  </>}
/>
```
