The app's primary navigation — dark-green fixed sidebar. Pass items with icon nodes; the active key gets the green fill.

```jsx
<SidebarNav
  brand={<img src="assets/logo-lockup-dark.png" style={{height:40}}/>}
  items={[
    { key:'dashboard', label:'Dashboard', icon:<GaugeIcon/> },
    { key:'farms', label:'Farm Management', icon:<WarehouseIcon/> },
    { key:'batches', label:'Batch Management', icon:<LayersIcon/> },
  ]}
  active="dashboard"
  onSelect={setView}
  footer={<Select label="Selected Farm" options={['RTL Main Farm']} />}
/>
```

- Lives at a fixed 260px width inside the AppShell flex row, full height.
- Active item = green-500 fill, white text; others are translucent and lighten on hover.
