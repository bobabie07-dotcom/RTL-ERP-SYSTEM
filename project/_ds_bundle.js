/* @ds-bundle: {"format":3,"namespace":"RTLPoultryFarmingERPDesignSystem_698a73","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Card","sourcePath":"components/data/Card.jsx"},{"name":"DataTable","sourcePath":"components/data/DataTable.jsx"},{"name":"ProgressRing","sourcePath":"components/data/ProgressRing.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"SidebarNav","sourcePath":"components/navigation/SidebarNav.jsx"},{"name":"Topbar","sourcePath":"components/navigation/Topbar.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"e56cd22a3e83","components/core/Badge.jsx":"182e548b2af1","components/core/Button.jsx":"353a5a5d0bb3","components/core/IconButton.jsx":"538c53adb741","components/core/Tag.jsx":"3c2f92ae4c2b","components/data/Card.jsx":"40541862985f","components/data/DataTable.jsx":"1388ed5c049e","components/data/ProgressRing.jsx":"ed717159a4a1","components/data/StatCard.jsx":"db0e11099d2c","components/forms/Checkbox.jsx":"cf4842ed971e","components/forms/Input.jsx":"72cebb024770","components/forms/Select.jsx":"001ef1ed8eca","components/navigation/SidebarNav.jsx":"d4fdb19b85ce","components/navigation/Topbar.jsx":"793adc03f163","ui_kits/erp/AppShell.jsx":"b39e5b56a31f","ui_kits/erp/BatchDetailScreen.jsx":"27d112038295","ui_kits/erp/DashboardScreen.jsx":"31c76098de24","ui_kits/erp/LoginScreen.jsx":"909016af52f4","ui_kits/erp/charts.jsx":"a5d5d91de51d","ui_kits/erp/icons.jsx":"a914c525a51e"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.RTLPoultryFarmingERPDesignSystem_698a73 = window.RTLPoultryFarmingERPDesignSystem_698a73 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
/**
 * RTL Poultry Farming ERP — Avatar
 * Circular user avatar. Renders an image if `src` given, else initials on a
 * tinted background. Optional name + role caption (top-bar account block).
 */
function Avatar({
  src,
  name = '',
  role,
  size = 36,
  showText = false,
  style = {}
}) {
  const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const circle = /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      flex: '0 0 auto',
      borderRadius: '50%',
      overflow: 'hidden',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: src ? 'var(--gray-100)' : 'var(--green-50)',
      color: 'var(--green-600)',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: Math.round(size * 0.4)
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials);
  if (!showText) return circle;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      ...style
    }
  }, circle, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      lineHeight: 1.2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, name), role ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)'
    }
  }, role) : null));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
/**
 * RTL Poultry Farming ERP — Badge
 * Small status pill. Tones map to semantic states; "soft" (default) uses a
 * tinted background, "solid" fills with the color, "dot" adds a leading dot.
 */
function Badge({
  children,
  tone = 'success',
  variant = 'soft',
  dot = false,
  style = {}
}) {
  const tones = {
    success: {
      color: 'var(--success)',
      bg: 'var(--success-bg)',
      solid: 'var(--success)'
    },
    danger: {
      color: 'var(--danger)',
      bg: 'var(--danger-bg)',
      solid: 'var(--danger)'
    },
    warning: {
      color: 'var(--warning)',
      bg: 'var(--warning-bg)',
      solid: 'var(--warning)'
    },
    info: {
      color: 'var(--info)',
      bg: 'var(--info-bg)',
      solid: 'var(--info)'
    },
    neutral: {
      color: 'var(--gray-600)',
      bg: 'var(--gray-100)',
      solid: 'var(--gray-500)'
    }
  };
  const t = tones[tone] || tones.success;
  const solid = variant === 'solid';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '3px 10px',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-xs)',
      fontWeight: 600,
      lineHeight: 1.4,
      color: solid ? '#fff' : t.color,
      background: solid ? t.solid : t.bg,
      whiteSpace: 'nowrap',
      ...style
    }
  }, dot ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: solid ? '#fff' : t.solid
    }
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/**
 * RTL Poultry Farming ERP — Button
 * Variants: primary (green CTA), secondary (outlined), ghost, danger.
 * Sizes: sm | md | lg. Optional leading/trailing icon nodes.
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  trailingIcon = null,
  disabled = false,
  fullWidth = false,
  type = 'button',
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const sizes = {
    sm: {
      padding: '0 12px',
      height: 32,
      font: 'var(--text-sm)',
      gap: 6,
      icon: 15
    },
    md: {
      padding: '0 18px',
      height: 40,
      font: 'var(--text-base)',
      gap: 8,
      icon: 17
    },
    lg: {
      padding: '0 24px',
      height: 48,
      font: 'var(--text-md)',
      gap: 9,
      icon: 19
    }
  };
  const s = sizes[size] || sizes.md;
  const palettes = {
    primary: {
      base: {
        background: 'var(--green-500)',
        color: 'var(--white)',
        border: '1px solid var(--green-500)'
      },
      hover: {
        background: 'var(--green-600)',
        borderColor: 'var(--green-600)'
      }
    },
    secondary: {
      base: {
        background: 'var(--white)',
        color: 'var(--text-strong)',
        border: '1px solid var(--border)'
      },
      hover: {
        background: 'var(--gray-50)',
        borderColor: 'var(--border-strong)'
      }
    },
    ghost: {
      base: {
        background: 'transparent',
        color: 'var(--text-body)',
        border: '1px solid transparent'
      },
      hover: {
        background: 'var(--gray-100)'
      }
    },
    danger: {
      base: {
        background: 'var(--danger)',
        color: 'var(--white)',
        border: '1px solid var(--danger)'
      },
      hover: {
        background: '#D63A3A',
        borderColor: '#D63A3A'
      }
    }
  };
  const p = palettes[variant] || palettes.primary;
  const styleObj = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.gap,
    height: s.height,
    padding: s.padding,
    width: fullWidth ? '100%' : 'auto',
    fontFamily: 'var(--font-body)',
    fontSize: s.font,
    fontWeight: 600,
    borderRadius: 'var(--radius-md)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background var(--dur-fast) var(--ease-std), transform var(--dur-fast) var(--ease-std)',
    transform: active && !disabled ? 'scale(0.98)' : 'none',
    whiteSpace: 'nowrap',
    ...p.base,
    ...(hover && !disabled ? p.hover : {}),
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    style: styleObj,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false)
  }, rest), icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: s.icon,
      height: s.icon
    }
  }, icon) : null, children, trailingIcon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: s.icon,
      height: s.icon
    }
  }, trailingIcon) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/**
 * RTL Poultry Farming ERP — IconButton
 * Square, icon-only button for top bars and table-row actions.
 * Tones: default (gray), brand (green), danger (red).
 */
function IconButton({
  children,
  tone = 'default',
  size = 'md',
  badge = null,
  title,
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const sizes = {
    sm: 30,
    md: 36,
    lg: 42
  };
  const dim = sizes[size] || sizes.md;
  const tones = {
    default: {
      color: 'var(--text-secondary)',
      hoverBg: 'var(--gray-100)',
      hoverColor: 'var(--text-strong)'
    },
    brand: {
      color: 'var(--green-500)',
      hoverBg: 'var(--green-50)',
      hoverColor: 'var(--green-600)'
    },
    danger: {
      color: 'var(--danger)',
      hoverBg: 'var(--danger-bg)',
      hoverColor: 'var(--danger)'
    }
  };
  const t = tones[tone] || tones.default;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    title: title,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: 'relative',
      width: dim,
      height: dim,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-md)',
      border: 'none',
      cursor: 'pointer',
      color: hover ? t.hoverColor : t.color,
      background: hover ? t.hoverBg : 'transparent',
      transition: 'background var(--dur-fast) var(--ease-std), color var(--dur-fast) var(--ease-std)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: Math.round(dim * 0.5),
      height: Math.round(dim * 0.5)
    }
  }, children), badge != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      right: 2,
      minWidth: 16,
      height: 16,
      padding: '0 4px',
      background: 'var(--danger)',
      color: '#fff',
      borderRadius: 'var(--radius-pill)',
      fontSize: 10,
      fontWeight: 700,
      lineHeight: '16px',
      textAlign: 'center',
      fontFamily: 'var(--font-body)',
      border: '2px solid var(--white)'
    }
  }, badge) : null);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
/**
 * RTL Poultry Farming ERP — Tag
 * Neutral, low-emphasis label/chip (categories, counts). Optional onRemove
 * renders a dismiss ✕. Quieter than Badge — no semantic color by default.
 */
function Tag({
  children,
  color = 'neutral',
  onRemove,
  style = {}
}) {
  const colors = {
    neutral: {
      color: 'var(--gray-700)',
      bg: 'var(--gray-100)'
    },
    green: {
      color: 'var(--green-700)',
      bg: 'var(--green-50)'
    }
  };
  const c = colors[color] || colors.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 'var(--radius-sm)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-xs)',
      fontWeight: 500,
      color: c.color,
      background: c.bg,
      ...style
    }
  }, children, onRemove ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onRemove,
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'inherit',
      padding: 0,
      lineHeight: 1,
      fontSize: 13,
      opacity: 0.7
    }
  }, "\u2715") : null);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/data/Card.jsx
try { (() => {
/**
 * RTL Poultry Farming ERP — Card
 * The workspace surface: white, 14px radius, hairline border + soft shadow.
 * Optional title row with a right-aligned `action` node (e.g. a Select or
 * "View All" link).
 */
function Card({
  title,
  subtitle,
  action,
  children,
  padding = 24,
  style = {},
  bodyStyle = {}
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
      ...style
    }
  }, title || action ? /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: `${padding - 6}px ${padding}px`,
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", null, title ? /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-h2)',
      fontSize: 'var(--text-lg)',
      color: 'var(--text-strong)'
    }
  }, title) : null, subtitle ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '3px 0 0',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-secondary)'
    }
  }, subtitle) : null), action ? /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '0 0 auto'
    }
  }, action) : null) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding,
      ...bodyStyle
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Card.jsx", error: String((e && e.message) || e) }); }

// components/data/DataTable.jsx
try { (() => {
/**
 * RTL Poultry Farming ERP — DataTable
 * Clean list table for batches, inventory, transactions. Columns describe
 * header label, key, optional align and a render(row) for custom cells
 * (badges, currency, actions). Hairline row dividers, gray-50 hover.
 */
function DataTable({
  columns = [],
  rows = [],
  rowKey = 'id',
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      overflowX: 'auto',
      ...style
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    style: {
      textAlign: c.align || 'left',
      padding: '12px 14px',
      fontSize: 'var(--text-xs)',
      fontWeight: 600,
      color: 'var(--text-secondary)',
      textTransform: 'none',
      borderBottom: '1px solid var(--border)',
      whiteSpace: 'nowrap'
    }
  }, c.header)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((row, i) => /*#__PURE__*/React.createElement("tr", {
    key: row[rowKey] != null ? row[rowKey] : i,
    style: {
      transition: 'background var(--dur-fast)'
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = 'var(--gray-50)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = 'transparent';
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("td", {
    key: c.key,
    style: {
      textAlign: c.align || 'left',
      padding: '13px 14px',
      fontSize: 'var(--text-sm)',
      color: c.strong ? 'var(--text-strong)' : 'var(--text-body)',
      fontWeight: c.strong ? 600 : 400,
      borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none',
      fontVariantNumeric: c.numeric ? 'tabular-nums' : 'normal',
      whiteSpace: 'nowrap'
    }
  }, c.render ? c.render(row) : row[c.key])))))));
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/data/ProgressRing.jsx
try { (() => {
/**
 * RTL Poultry Farming ERP — ProgressRing
 * Circular percentage indicator (batch progress, survival rate). SVG ring
 * with a green track by default; center shows the value + optional caption.
 */
function ProgressRing({
  value = 0,
  size = 96,
  thickness = 9,
  color = 'var(--green-500)',
  track = 'var(--gray-200)',
  label,
  style = {}
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: size,
      height: size,
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    style: {
      transform: 'rotate(-90deg)'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: track,
    strokeWidth: thickness
  }), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: color,
    strokeWidth: thickness,
    strokeLinecap: "round",
    strokeDasharray: circ,
    strokeDashoffset: offset,
    style: {
      transition: 'stroke-dashoffset var(--dur-slow) var(--ease-out)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: size * 0.24,
      fontWeight: 700,
      color: 'var(--text-strong)',
      lineHeight: 1
    }
  }, pct, "%"), label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      marginTop: 4
    }
  }, label) : null));
}
Object.assign(__ds_scope, { ProgressRing });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ProgressRing.jsx", error: String((e && e.message) || e) }); }

// components/data/StatCard.jsx
try { (() => {
/**
 * RTL Poultry Farming ERP — StatCard
 * The signature KPI tile: label + big value on the left, a 48px tinted circle
 * with a line icon on the right, and a signed trend delta below.
 * `tone` colors the icon circle; `trendGood` decides delta color independent
 * of arrow direction (mortality going down is good).
 */
function StatCard({
  label,
  value,
  icon = null,
  tone = 'green',
  delta,
  deltaDir = 'up',
  deltaGood,
  caption = 'vs last month',
  style = {}
}) {
  const tones = {
    green: {
      fg: 'var(--green-500)',
      bg: 'var(--green-50)'
    },
    red: {
      fg: 'var(--danger)',
      bg: 'var(--danger-bg)'
    },
    amber: {
      fg: 'var(--warning)',
      bg: 'var(--warning-bg)'
    },
    blue: {
      fg: 'var(--info)',
      bg: 'var(--info-bg)'
    },
    purple: {
      fg: 'var(--viz-utilities)',
      bg: '#F1ECFD'
    }
  };
  const t = tones[tone] || tones.green;
  // If deltaGood not specified, "up" is good by default.
  const good = deltaGood == null ? deltaDir === 'up' : deltaGood;
  const deltaColor = good ? 'var(--success)' : 'var(--danger)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      padding: 'var(--space-6)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      fontWeight: 600,
      color: 'var(--text-secondary)'
    }
  }, label), icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 48,
      height: 48,
      flex: '0 0 auto',
      borderRadius: '50%',
      background: t.bg,
      color: t.fg,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 22,
      height: 22
    }
  }, icon)) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-3xl)',
      fontWeight: 700,
      color: 'var(--text-strong)',
      fontVariantNumeric: 'tabular-nums',
      lineHeight: 1.1
    }
  }, value), delta != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-xs)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: deltaColor,
      fontWeight: 700
    }
  }, deltaDir === 'up' ? '↑' : '↓', " ", delta), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)'
    }
  }, caption)) : null);
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
/**
 * RTL Poultry Farming ERP — Checkbox
 * Square checkbox with green checked fill (e.g. "Remember me", row select).
 */
function Checkbox({
  label,
  checked = false,
  onChange,
  disabled = false,
  id,
  style = {}
}) {
  const cbId = id || (label ? `cb-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: cbId,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 9,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-base)',
      color: 'var(--text-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      flex: '0 0 auto',
      borderRadius: 5,
      border: `1.5px solid ${checked ? 'var(--green-500)' : 'var(--border-strong)'}`,
      background: checked ? 'var(--green-500)' : 'var(--white)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background var(--dur-fast), border-color var(--dur-fast)'
    }
  }, checked ? /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 12 12",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2.5 6.2L4.8 8.5L9.5 3.5",
    stroke: "#fff",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })) : null), /*#__PURE__*/React.createElement("input", {
    id: cbId,
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/**
 * RTL Poultry Farming ERP — Input
 * Labeled text field with optional leading icon, trailing node (e.g. a
 * password reveal), and error state. Border greens + soft ring on focus.
 */
function Input({
  label,
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  icon = null,
  trailing = null,
  error,
  disabled = false,
  id,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = useState(false);
  const inputId = id || (label ? `in-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const borderColor = error ? 'var(--danger)' : focus ? 'var(--green-500)' : 'var(--border)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
      width: '100%',
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      fontWeight: 600,
      color: 'var(--text-body)'
    }
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      height: 46,
      padding: '0 14px',
      background: disabled ? 'var(--gray-100)' : 'var(--white)',
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: focus && !error ? '0 0 0 3px var(--ring)' : 'none',
      transition: 'border-color var(--dur-fast) var(--ease-std), box-shadow var(--dur-fast) var(--ease-std)'
    }
  }, icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 18,
      height: 18,
      color: 'var(--text-muted)',
      flex: '0 0 auto'
    }
  }, icon) : null, /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    placeholder: placeholder,
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-base)',
      color: 'var(--text-strong)',
      width: '100%'
    }
  }, rest)), trailing ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      color: 'var(--text-muted)',
      flex: '0 0 auto'
    }
  }, trailing) : null), error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-xs)',
      color: 'var(--danger)'
    }
  }, error) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
const {
  useState
} = React;
/**
 * RTL Poultry Farming ERP — Select
 * Lightweight styled dropdown wrapping a native <select> for the filter
 * controls used across the ERP (farm picker, date range, category, status).
 */
function Select({
  label,
  options = [],
  value,
  defaultValue,
  onChange,
  disabled = false,
  id,
  style = {}
}) {
  const [focus, setFocus] = useState(false);
  const selId = id || (label ? `sel-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const opts = options.map(o => typeof o === 'string' ? {
    value: o,
    label: o
  } : o);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: selId,
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      fontWeight: 600,
      color: 'var(--text-body)'
    }
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      height: 42,
      background: disabled ? 'var(--gray-100)' : 'var(--white)',
      border: `1px solid ${focus ? 'var(--green-500)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: focus ? '0 0 0 3px var(--ring)' : 'none',
      transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)'
    }
  }, /*#__PURE__*/React.createElement("select", {
    id: selId,
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      appearance: 'none',
      WebkitAppearance: 'none',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-base)',
      color: 'var(--text-strong)',
      padding: '0 38px 0 14px',
      height: '100%',
      width: '100%',
      cursor: disabled ? 'not-allowed' : 'pointer'
    }
  }, opts.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 12,
      pointerEvents: 'none',
      color: 'var(--text-muted)',
      fontSize: 11
    }
  }, "\u25BE")));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SidebarNav.jsx
try { (() => {
/**
 * RTL Poultry Farming ERP — SidebarNav
 * The fixed dark-green app sidebar: brand lockup at top, a scrollable nav
 * list (icon + label, green active state), and an optional footer slot
 * (farm selector / brand slogan). Items: {key, label, icon}.
 */
function SidebarNav({
  brand,
  items = [],
  active,
  onSelect,
  footer = null,
  width = 260,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      width,
      flex: `0 0 ${width}px`,
      height: '100%',
      background: 'var(--ink-900)',
      color: 'var(--text-on-dark)',
      display: 'flex',
      flexDirection: 'column',
      ...style
    }
  }, brand ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 20px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      borderBottom: '1px solid rgba(255,255,255,0.06)'
    }
  }, brand) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '12px 12px'
    }
  }, items.map(it => {
    const isActive = it.key === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.key,
      type: "button",
      onClick: () => onSelect && onSelect(it.key),
      onMouseEnter: e => {
        if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
      },
      onMouseLeave: e => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      },
      style: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 14px',
        marginBottom: 2,
        border: 'none',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-base)',
        fontWeight: isActive ? 600 : 500,
        color: isActive ? '#fff' : 'rgba(232,240,235,0.78)',
        background: isActive ? 'var(--green-500)' : 'transparent',
        transition: 'background var(--dur-fast) var(--ease-std)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        width: 19,
        height: 19,
        flex: '0 0 auto',
        opacity: isActive ? 1 : 0.9
      }
    }, it.icon), it.label);
  })), footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      borderTop: '1px solid rgba(255,255,255,0.06)'
    }
  }, footer) : null);
}
Object.assign(__ds_scope, { SidebarNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SidebarNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Topbar.jsx
try { (() => {
/**
 * RTL Poultry Farming ERP — Topbar
 * The app header: menu toggle + page title on the left; right-aligned actions
 * slot (date picker, notifications, account). Sits above the content area.
 */
function Topbar({
  title,
  onMenu,
  left = null,
  right = null,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 'var(--topbar-h)',
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: '0 24px',
      background: 'var(--surface-card)',
      borderBottom: '1px solid var(--border)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, onMenu ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onMenu,
    "aria-label": "Toggle menu",
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-body)',
      display: 'inline-flex',
      padding: 4
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "6",
    x2: "21",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "12",
    x2: "21",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "18",
    x2: "21",
    y2: "18"
  }))) : null, title ? /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-h1)',
      fontSize: 'var(--text-xl)',
      color: 'var(--text-strong)'
    }
  }, title) : null, left), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, right));
}
Object.assign(__ds_scope, { Topbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Topbar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/erp/AppShell.jsx
try { (() => {
/* RTL Poultry Farming ERP — AppShell: sidebar + topbar + content slot. */
const {
  SidebarNav,
  Topbar,
  IconButton,
  Avatar,
  Select
} = window.RTLPoultryFarmingERPDesignSystem_698a73;
function AppShell({
  active,
  onSelect,
  title,
  children
}) {
  const I = window.RTLIcons;
  const nav = [{
    key: 'dashboard',
    label: 'Dashboard',
    icon: /*#__PURE__*/React.createElement(I.dashboard, {
      w: 19
    })
  }, {
    key: 'farms',
    label: 'Farm Management',
    icon: /*#__PURE__*/React.createElement(I.farm, {
      w: 19
    })
  }, {
    key: 'houses',
    label: 'Poultry Houses',
    icon: /*#__PURE__*/React.createElement(I.house, {
      w: 19
    })
  }, {
    key: 'batches',
    label: 'Batch Management',
    icon: /*#__PURE__*/React.createElement(I.batch, {
      w: 19
    })
  }, {
    key: 'inventory',
    label: 'Inventory',
    icon: /*#__PURE__*/React.createElement(I.inventory, {
      w: 19
    })
  }, {
    key: 'feed',
    label: 'Feed Management',
    icon: /*#__PURE__*/React.createElement(I.feed, {
      w: 19
    })
  }, {
    key: 'mortality',
    label: 'Mortality Tracker',
    icon: /*#__PURE__*/React.createElement(I.mortality, {
      w: 19
    })
  }, {
    key: 'sales',
    label: 'Sales & Procurement',
    icon: /*#__PURE__*/React.createElement(I.sales, {
      w: 19
    })
  }, {
    key: 'reports',
    label: 'Reports & Analytics',
    icon: /*#__PURE__*/React.createElement(I.reports, {
      w: 19
    })
  }, {
    key: 'settings',
    label: 'Settings',
    icon: /*#__PURE__*/React.createElement(I.settings, {
      w: 19
    })
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100%',
      minHeight: 600,
      fontFamily: 'var(--font-body)',
      background: 'var(--surface-page)'
    }
  }, /*#__PURE__*/React.createElement(SidebarNav, {
    brand: /*#__PURE__*/React.createElement("img", {
      src: window.__resources && window.__resources.logoLockup || '../../assets/logo-lockup-dark.png',
      alt: "RTL Poultry Farming ERP",
      style: {
        height: 40
      }
    }),
    items: nav,
    active: active,
    onSelect: onSelect,
    footer: /*#__PURE__*/React.createElement(Select, {
      options: ['RTL Main Farm', 'RTL North Farm', 'All Farms']
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(Topbar, {
    title: title,
    right: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(IconButton, {
      title: "Messages",
      badge: 2
    }, /*#__PURE__*/React.createElement(I.mail, {
      w: 18
    })), /*#__PURE__*/React.createElement(IconButton, {
      title: "Notifications",
      badge: 4
    }, /*#__PURE__*/React.createElement(I.bell, {
      w: 18
    })), /*#__PURE__*/React.createElement(Select, {
      options: ['May 12, 2025']
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 1,
        height: 28,
        background: 'var(--border)'
      }
    }), /*#__PURE__*/React.createElement(Avatar, {
      name: "Admin User",
      role: "Farm Manager",
      showText: true
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto'
    }
  }, children)));
}
window.AppShell = AppShell;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/erp/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/erp/BatchDetailScreen.jsx
try { (() => {
/* RTL Poultry Farming ERP — Batch Detail screen content (inside AppShell). */
const {
  StatCard,
  Card,
  DataTable,
  Badge,
  Button,
  ProgressRing
} = window.RTLPoultryFarmingERPDesignSystem_698a73;
function BatchDetailScreen({
  batch,
  onBack
}) {
  const I = window.RTLIcons;
  const {
    LineChart
  } = window.RTLCharts;
  const b = batch || {
    batch: 'BATCH-2025-08',
    house: 'House A-1',
    birds: '12,400'
  };
  const events = [{
    date: 'May 12',
    type: 'Vaccination',
    detail: 'Newcastle Disease (B1)',
    by: 'Dr. Santos',
    status: 'Done'
  }, {
    date: 'May 09',
    type: 'Medication',
    detail: 'Vitamin supplement in water',
    by: 'J. Cruz',
    status: 'Done'
  }, {
    date: 'May 05',
    type: 'Weighing',
    detail: 'Avg. weight 1.18 kg',
    by: 'M. Reyes',
    status: 'Done'
  }, {
    date: 'May 14',
    type: 'Vaccination',
    detail: 'Infectious Bronchitis',
    by: 'Scheduled',
    status: 'Upcoming'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(I.chevronRight, {
      w: 15,
      style: {
        transform: 'rotate(180deg)'
      }
    }),
    onClick: onBack
  }, "Back"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      fontWeight: 700,
      color: 'var(--text-strong)',
      margin: 0
    }
  }, b.batch), /*#__PURE__*/React.createElement(Badge, {
    tone: "success",
    dot: true
  }, "Active")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      fontSize: 14,
      color: 'var(--text-secondary)'
    }
  }, b.house, " \xB7 RTL Main Farm \xB7 started Apr 14, 2025"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "md",
    icon: /*#__PURE__*/React.createElement(I.syringe, {
      w: 16
    })
  }, "Add Record"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "md",
    icon: /*#__PURE__*/React.createElement(I.harvest, {
      w: 16
    })
  }, "Mark Harvest"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    label: "Current Birds",
    value: b.birds || '12,400',
    icon: /*#__PURE__*/React.createElement(I.birds, {
      w: 22
    }),
    delta: "430 lost",
    deltaDir: "down",
    deltaGood: false,
    caption: "since placement"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Avg. Weight (kg)",
    value: "1.42",
    tone: "blue",
    icon: /*#__PURE__*/React.createElement(I.scale, {
      w: 22
    }),
    delta: "0.08",
    deltaDir: "up",
    caption: "vs last week"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "FCR",
    value: "1.62",
    tone: "amber",
    icon: /*#__PURE__*/React.createElement(I.feed, {
      w: 22
    }),
    delta: "0.03",
    deltaDir: "down",
    deltaGood: true,
    caption: "vs target"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Survival Rate",
    value: "96.5%",
    icon: /*#__PURE__*/React.createElement(I.percent, {
      w: 22
    }),
    delta: "0.4%",
    deltaDir: "up",
    caption: "vs last week"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.6fr 1fr',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Average Weight Gain (kg)"
  }, /*#__PURE__*/React.createElement(LineChart, {
    data: [0.05, 0.18, 0.34, 0.55, 0.82, 1.12, 1.42],
    color: "var(--info)",
    labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Batch Progress",
    bodyStyle: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 14,
      padding: '20px 24px'
    }
  }, /*#__PURE__*/React.createElement(ProgressRing, {
    value: 61,
    label: "of 45-day cycle",
    size: 120
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, "Day ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--text-strong)'
    }
  }, "28"), " of 45 \xB7 est. harvest ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--text-strong)'
    }
  }, "Jun 1")))), /*#__PURE__*/React.createElement(Card, {
    title: "Health & Activity Log",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      icon: /*#__PURE__*/React.createElement(I.plus, {
        w: 15
      })
    }, "Add Record")
  }, /*#__PURE__*/React.createElement(DataTable, {
    columns: [{
      key: 'date',
      header: 'Date',
      strong: true
    }, {
      key: 'type',
      header: 'Type',
      render: r => /*#__PURE__*/React.createElement(Badge, {
        tone: r.type === 'Vaccination' ? 'info' : r.type === 'Medication' ? 'warning' : 'neutral'
      }, r.type)
    }, {
      key: 'detail',
      header: 'Detail'
    }, {
      key: 'by',
      header: 'Recorded By'
    }, {
      key: 'status',
      header: 'Status',
      render: r => /*#__PURE__*/React.createElement(Badge, {
        tone: r.status === 'Done' ? 'success' : 'neutral',
        dot: true
      }, r.status)
    }],
    rows: events,
    rowKey: "date"
  })));
}
window.BatchDetailScreen = BatchDetailScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/erp/BatchDetailScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/erp/DashboardScreen.jsx
try { (() => {
/* RTL Poultry Farming ERP — Dashboard screen content (inside AppShell). */
const {
  StatCard,
  Card,
  DataTable,
  Badge,
  Button,
  Select
} = window.RTLPoultryFarmingERPDesignSystem_698a73;
function DashboardScreen({
  onOpenBatch
}) {
  const I = window.RTLIcons;
  const {
    LineChart,
    DonutChart,
    BarChart
  } = window.RTLCharts;
  const expense = [{
    label: 'Feed',
    value: 58,
    color: 'var(--viz-feed)'
  }, {
    label: 'Labor',
    value: 18,
    color: 'var(--viz-labor)'
  }, {
    label: 'Medicine',
    value: 11,
    color: 'var(--viz-medicine)'
  }, {
    label: 'Utilities',
    value: 8,
    color: 'var(--viz-utilities)'
  }, {
    label: 'Others',
    value: 5,
    color: 'var(--viz-others)'
  }];
  const batches = [{
    batch: 'BATCH-2025-08',
    house: 'House A-1',
    birds: '12,400',
    age: '28 days',
    mort: '3.45%',
    fcr: '1.62',
    status: 'Active'
  }, {
    batch: 'BATCH-2025-07',
    house: 'House B-2',
    birds: '11,850',
    age: '34 days',
    mort: '4.12%',
    fcr: '1.65',
    status: 'Active'
  }, {
    batch: 'BATCH-2025-06',
    house: 'House C-1',
    birds: '10,200',
    age: '41 days',
    mort: '4.28%',
    fcr: '1.70',
    status: 'Harvest Soon'
  }, {
    batch: 'BATCH-2025-05',
    house: 'House A-2',
    birds: '13,800',
    age: '19 days',
    mort: '2.91%',
    fcr: '1.58',
    status: 'Active'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      fontWeight: 700,
      color: 'var(--text-strong)',
      margin: 0
    }
  }, "Welcome back, Admin!"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      fontSize: 14,
      color: 'var(--text-secondary)'
    }
  }, "Here's what's happening on your farms today.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    label: "Total Birds",
    value: "48,250",
    icon: /*#__PURE__*/React.createElement(I.birds, {
      w: 22
    }),
    delta: "5.6%",
    deltaDir: "up"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Mortality Rate",
    value: "4.21%",
    tone: "red",
    icon: /*#__PURE__*/React.createElement(I.mortality, {
      w: 22
    }),
    delta: "0.6%",
    deltaDir: "down",
    deltaGood: true
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Feed Consumed (kg)",
    value: "9,840",
    tone: "amber",
    icon: /*#__PURE__*/React.createElement(I.feed, {
      w: 22
    }),
    delta: "3.2%",
    deltaDir: "up",
    deltaGood: false
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Revenue (\u20B1)",
    value: "\u20B16.78M",
    tone: "blue",
    icon: /*#__PURE__*/React.createElement(I.trendUp, {
      w: 22
    }),
    delta: "12.4%",
    deltaDir: "up"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.6fr 1fr',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Mortality Trend (%)",
    action: /*#__PURE__*/React.createElement(Select, {
      options: ['Last 7 days', 'Last 30 days']
    })
  }, /*#__PURE__*/React.createElement(LineChart, {
    data: [5.1, 4.8, 4.9, 4.4, 4.3, 4.5, 4.21],
    color: "var(--viz-mortality)",
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Expense Breakdown"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(DonutChart, {
    segments: expense
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 20,
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, "\u20B12.4M"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, "this month"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 9,
      flex: 1
    }
  }, expense.map(e => /*#__PURE__*/React.createElement("div", {
    key: e.label,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 3,
      background: e.color,
      flex: '0 0 auto'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-body)',
      flex: 1
    }
  }, e.label), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-strong)',
      fontWeight: 600,
      fontVariantNumeric: 'tabular-nums'
    }
  }, e.value, "%"))))))), /*#__PURE__*/React.createElement(Card, {
    title: "Feed Consumption by House (kg)",
    action: /*#__PURE__*/React.createElement(Select, {
      options: ['This week']
    })
  }, /*#__PURE__*/React.createElement(BarChart, {
    data: [{
      value: 1840,
      label2: '1,840',
      color: 'var(--viz-feed)'
    }, {
      value: 1620,
      label2: '1,620',
      color: 'var(--viz-feed)'
    }, {
      value: 1390,
      label2: '1,390',
      color: 'var(--viz-feed)'
    }, {
      value: 2010,
      label2: '2,010',
      color: 'var(--green-400)'
    }, {
      value: 1280,
      label2: '1,280',
      color: 'var(--viz-feed)'
    }, {
      value: 1700,
      label2: '1,700',
      color: 'var(--viz-feed)'
    }],
    labels: ['House A-1', 'House B-2', 'House C-1', 'House A-2', 'House B-1', 'House C-2']
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Active Batches",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      icon: /*#__PURE__*/React.createElement(I.chevronRight, {
        w: 15
      })
    }, "View All Batches")
  }, /*#__PURE__*/React.createElement(DataTable, {
    columns: [{
      key: 'batch',
      header: 'Batch No.',
      strong: true,
      render: r => /*#__PURE__*/React.createElement("a", {
        href: "#",
        onClick: e => {
          e.preventDefault();
          onOpenBatch && onOpenBatch(r);
        },
        style: {
          fontWeight: 600
        }
      }, r.batch)
    }, {
      key: 'house',
      header: 'House'
    }, {
      key: 'birds',
      header: 'Birds',
      align: 'right',
      numeric: true
    }, {
      key: 'age',
      header: 'Age',
      align: 'right'
    }, {
      key: 'mort',
      header: 'Mortality %',
      align: 'right',
      numeric: true
    }, {
      key: 'fcr',
      header: 'FCR',
      align: 'right',
      numeric: true
    }, {
      key: 'status',
      header: 'Status',
      render: r => /*#__PURE__*/React.createElement(Badge, {
        tone: r.status === 'Harvest Soon' ? 'warning' : 'success',
        dot: true
      }, r.status)
    }],
    rows: batches,
    rowKey: "batch"
  })));
}
window.DashboardScreen = DashboardScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/erp/DashboardScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/erp/LoginScreen.jsx
try { (() => {
/* RTL Poultry Farming ERP — Login screen.
   Split layout: dark brand hero (left) + white sign-in card (right). */
const {
  Button,
  Input,
  Checkbox,
  IconButton
} = window.RTLPoultryFarmingERPDesignSystem_698a73;
function LoginScreen({
  onLogin
}) {
  const I = window.RTLIcons;
  const [show, setShow] = React.useState(false);
  const [user, setUser] = React.useState('admin');
  const [pass, setPass] = React.useState('rtl-poultry');
  const features = [['birds', 'Track flocks, batches & poultry houses'], ['scale', 'Monitor feed, weight & FCR in real time'], ['pie', 'Expenses, sales & profit analytics']];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100%',
      minHeight: 560,
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '1 1 52%',
      position: 'relative',
      background: 'var(--ink-900)',
      color: 'var(--text-on-dark)',
      padding: '48px 52px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: `url(${window.__resources && window.__resources.heroPoultry || '../../assets/hero-poultry.png'})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      opacity: 0.22
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(135deg, rgba(7,31,17,0.86) 0%, rgba(7,31,17,0.62) 100%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__resources && window.__resources.logoLockup || '../../assets/logo-lockup-dark.png',
    alt: "RTL Poultry Farming ERP",
    style: {
      height: 56
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 46,
      fontWeight: 700,
      lineHeight: 1.08,
      letterSpacing: '-0.02em',
      color: '#fff',
      margin: 0
    }
  }, "Manage Smarter.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--green-400)'
    }
  }, "Farm Better.")), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 16,
      fontSize: 15,
      color: 'rgba(232,240,235,0.8)',
      maxWidth: 380,
      lineHeight: 1.6
    }
  }, "The complete ERP for modern poultry farm management \u2014 flocks, feed, finance, all in one place."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 28,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, features.map(([ic, txt]) => {
    const Glyph = I[ic];
    return /*#__PURE__*/React.createElement("div", {
      key: txt,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 34,
        height: 34,
        borderRadius: 9,
        background: 'rgba(47,172,100,0.18)',
        color: 'var(--green-400)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto'
      }
    }, /*#__PURE__*/React.createElement(Glyph, {
      w: 17
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: 'rgba(232,240,235,0.92)'
      }
    }, txt));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      fontSize: 12,
      color: 'rgba(232,240,235,0.5)'
    }
  }, "\xA9 2025 RTL Poultry Farming ERP")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '1 1 48%',
      background: 'var(--surface-card)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40
    }
  }, /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      onLogin && onLogin();
    },
    style: {
      width: '100%',
      maxWidth: 380,
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 14,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 64,
      height: 64,
      borderRadius: '50%',
      background: 'var(--green-50)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__resources && window.__resources.logoMark || '../../assets/logo-mark.png',
    alt: "",
    style: {
      width: 46,
      height: 46,
      objectFit: 'contain'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 24,
      fontWeight: 700,
      color: 'var(--text-strong)',
      margin: 0
    }
  }, "Welcome back"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      fontSize: 14,
      color: 'var(--text-secondary)'
    }
  }, "Sign in to your farm dashboard"))), /*#__PURE__*/React.createElement(Input, {
    label: "Username",
    placeholder: "Enter your username",
    icon: /*#__PURE__*/React.createElement(I.user, null),
    value: user,
    onChange: e => setUser(e.target.value)
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Password",
    type: show ? 'text' : 'password',
    placeholder: "Enter your password",
    icon: /*#__PURE__*/React.createElement(I.lock, null),
    value: pass,
    onChange: e => setPass(e.target.value),
    trailing: /*#__PURE__*/React.createElement(IconButton, {
      size: "sm",
      onClick: () => setShow(s => !s),
      title: show ? 'Hide' : 'Show'
    }, show ? /*#__PURE__*/React.createElement(I.eyeOff, null) : /*#__PURE__*/React.createElement(I.eye, null))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    label: "Remember me",
    checked: true,
    onChange: () => {}
  }), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, "Forgot password?")), /*#__PURE__*/React.createElement(Button, {
    type: "submit",
    variant: "primary",
    size: "lg",
    fullWidth: true
  }, "Login"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      color: 'var(--text-muted)',
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--border)'
    }
  }), " OR ", /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--border)'
    }
  })), /*#__PURE__*/React.createElement(Button, {
    type: "button",
    variant: "secondary",
    size: "lg",
    fullWidth: true,
    icon: /*#__PURE__*/React.createElement(I.google, {
      w: 18
    })
  }, "Sign in with Google"), /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: 'center',
      fontSize: 13,
      color: 'var(--text-secondary)',
      margin: 0
    }
  }, "Don't have an account? ", /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      fontWeight: 600
    }
  }, "Contact your administrator")))));
}
window.LoginScreen = LoginScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/erp/LoginScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/erp/charts.jsx
try { (() => {
/* RTL Poultry Farming ERP — lightweight inline-SVG charts for the UI kit.
   Cosmetic recreations (not a charting lib). Exported to window. */

function LineChart({
  data,
  color = 'var(--green-500)',
  height = 180,
  labels = [],
  yTicks = [],
  dotted = false
}) {
  const w = 560,
    h = height,
    padL = 36,
    padB = 26,
    padT = 10,
    padR = 8;
  const max = Math.max(...data) * 1.15 || 1;
  const min = 0;
  const ix = i => padL + i / (data.length - 1) * (w - padL - padR);
  const iy = v => padT + (1 - (v - min) / (max - min)) * (h - padT - padB);
  const pts = data.map((v, i) => `${ix(i)},${iy(v)}`).join(' ');
  const area = `${padL},${h - padB} ${pts} ${ix(data.length - 1)},${h - padB}`;
  const grid = yTicks.length ? yTicks : [0, max * 0.25, max * 0.5, max * 0.75, max];
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${w} ${h}`,
    style: {
      width: '100%',
      height: 'auto',
      display: 'block'
    },
    preserveAspectRatio: "none"
  }, grid.map((t, i) => {
    const y = iy(t);
    return /*#__PURE__*/React.createElement("g", {
      key: i
    }, /*#__PURE__*/React.createElement("line", {
      x1: padL,
      y1: y,
      x2: w - padR,
      y2: y,
      stroke: "var(--border-subtle)",
      strokeWidth: "1"
    }), /*#__PURE__*/React.createElement("text", {
      x: padL - 6,
      y: y + 3,
      textAnchor: "end",
      fontSize: "9",
      fill: "var(--text-muted)",
      fontFamily: "var(--font-body)"
    }, Math.round(t)));
  }), /*#__PURE__*/React.createElement("polygon", {
    points: area,
    fill: color,
    opacity: "0.07"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: pts,
    fill: "none",
    stroke: color,
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeDasharray: dotted ? '5 4' : 'none'
  }), data.map((v, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: ix(i),
    cy: iy(v),
    r: "3.4",
    fill: "#fff",
    stroke: color,
    strokeWidth: "2"
  })), labels.map((l, i) => /*#__PURE__*/React.createElement("text", {
    key: i,
    x: ix(i),
    y: h - 8,
    textAnchor: "middle",
    fontSize: "9",
    fill: "var(--text-muted)",
    fontFamily: "var(--font-body)"
  }, l)));
}
function DonutChart({
  segments,
  size = 168,
  thickness = 30
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2,
    cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`
  }, /*#__PURE__*/React.createElement("g", {
    transform: `rotate(-90 ${cx} ${cy})`
  }, segments.map((s, i) => {
    const len = s.value / total * circ;
    const el = /*#__PURE__*/React.createElement("circle", {
      key: i,
      cx: cx,
      cy: cy,
      r: r,
      fill: "none",
      stroke: s.color,
      strokeWidth: thickness,
      strokeDasharray: `${len} ${circ - len}`,
      strokeDashoffset: -acc
    });
    acc += len;
    return el;
  })));
}
function BarChart({
  data,
  height = 180,
  labels = [],
  ranks = []
}) {
  const w = 560,
    h = height,
    padL = 30,
    padB = 40,
    padT = 16,
    padR = 8;
  const max = Math.max(...data.map(d => d.value)) * 1.18 || 1;
  const n = data.length;
  const slot = (w - padL - padR) / n;
  const bw = slot * 0.46;
  const iy = v => padT + (1 - v / max) * (h - padT - padB);
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${w} ${h}`,
    style: {
      width: '100%',
      height: 'auto',
      display: 'block'
    }
  }, data.map((d, i) => {
    const x = padL + slot * i + (slot - bw) / 2;
    const y = iy(d.value);
    return /*#__PURE__*/React.createElement("g", {
      key: i
    }, /*#__PURE__*/React.createElement("rect", {
      x: x,
      y: y,
      width: bw,
      height: h - padB - y,
      rx: "5",
      fill: d.color
    }), /*#__PURE__*/React.createElement("text", {
      x: x + bw / 2,
      y: y - 6,
      textAnchor: "middle",
      fontSize: "10",
      fontWeight: "700",
      fill: "var(--text-strong)",
      fontFamily: "var(--font-display)"
    }, d.label2), /*#__PURE__*/React.createElement("text", {
      x: x + bw / 2,
      y: h - padB + 16,
      textAnchor: "middle",
      fontSize: "9",
      fill: "var(--text-secondary)",
      fontFamily: "var(--font-body)"
    }, labels[i]), ranks[i] != null ? /*#__PURE__*/React.createElement("text", {
      x: x + bw / 2,
      y: h - padB + 30,
      textAnchor: "middle",
      fontSize: "9",
      fontWeight: "700",
      fill: "var(--text-muted)",
      fontFamily: "var(--font-body)"
    }, ranks[i]) : null);
  }));
}
window.RTLCharts = {
  LineChart,
  DonutChart,
  BarChart
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/erp/charts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/erp/icons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* RTL Poultry Farming ERP — UI kit icon set (Lucide-style stroke SVGs).
   Exported to window for use across screen files. */
const Ic = ({
  d,
  w = 20,
  s = 2
}) => /*#__PURE__*/React.createElement("svg", {
  width: w,
  height: w,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: s,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  dangerouslySetInnerHTML: {
    __html: d
  }
});
const Icons = {
  dashboard: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<rect x=\"3\" y=\"3\" width=\"7\" height=\"9\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"5\"/><rect x=\"14\" y=\"12\" width=\"7\" height=\"9\"/><rect x=\"3\" y=\"16\" width=\"7\" height=\"5\"/>"
  })),
  farm: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M3 21V9l9-6 9 6v12\"/><path d=\"M9 21v-6h6v6\"/>"
  })),
  house: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M3 9l9-7 9 7v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z\"/>"
  })),
  batch: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<polygon points=\"12 2 2 7 12 12 22 7 12 2\"/><polyline points=\"2 17 12 22 22 17\"/><polyline points=\"2 12 12 17 22 12\"/>"
  })),
  inventory: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M20 7H4M20 7l-2-3H6L4 7M20 7v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7\"/>"
  })),
  feed: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M3 3h18v4H3zM5 7v13h14V7M9 11h6\"/>"
  })),
  mortality: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M20.42 4.58a5.4 5.4 0 0 0-7.65 0L12 5.35l-.77-.77a5.4 5.4 0 0 0-7.65 7.65l.77.77L12 21l7.65-7.65.77-.77a5.4 5.4 0 0 0 0-7.65z\"/>"
  })),
  medication: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z\"/><path d=\"m8.5 8.5 7 7\"/>"
  })),
  procurement: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<circle cx=\"8\" cy=\"21\" r=\"1\"/><circle cx=\"19\" cy=\"21\" r=\"1\"/><path d=\"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12\"/>"
  })),
  expense: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"2\"/><line x1=\"2\" y1=\"10\" x2=\"22\" y2=\"10\"/>"
  })),
  sales: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z\"/><line x1=\"3\" y1=\"6\" x2=\"21\" y2=\"6\"/><path d=\"M16 10a4 4 0 0 1-8 0\"/>"
  })),
  reports: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M3 3v18h18\"/><rect x=\"7\" y=\"9\" width=\"3\" height=\"9\"/><rect x=\"13\" y=\"5\" width=\"3\" height=\"13\"/>"
  })),
  alerts: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9\"/><path d=\"M13.7 21a2 2 0 0 1-3.4 0\"/>"
  })),
  users: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M23 21v-2a4 4 0 0 0-3-3.87\"/><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/>"
  })),
  settings: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z\"/>"
  })),
  bell: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9\"/><path d=\"M13.7 21a2 2 0 0 1-3.4 0\"/>"
  })),
  mail: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/><path d=\"m22 7-10 5L2 7\"/>"
  })),
  calendar: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"6\"/><line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"6\"/><line x1=\"3\" y1=\"10\" x2=\"21\" y2=\"10\"/>"
  })),
  user: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/>"
  })),
  lock: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>"
  })),
  eye: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>"
  })),
  eyeOff: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24\"/><path d=\"M1 1l22 22\"/><path d=\"M4.5 7.5A18.7 18.7 0 0 0 1 12s4 8 11 8a9.7 9.7 0 0 0 4.5-1.06\"/>"
  })),
  chevronDown: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<polyline points=\"6 9 12 15 18 9\"/>"
  })),
  chevronRight: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<polyline points=\"9 18 15 12 9 6\"/>"
  })),
  plus: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/>"
  })),
  pencil: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z\"/>"
  })),
  trash: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/>"
  })),
  birds: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M16 7h.01\"/><path d=\"M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20\"/><path d=\"m20 7 2 .5-2 .5\"/><path d=\"M10 18v3\"/><path d=\"M14 17.75V21\"/><path d=\"M7 18a6 6 0 0 0 3.84-10.61\"/>"
  })),
  population: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M23 21v-2a4 4 0 0 0-3-3.87\"/>"
  })),
  trendUp: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<polyline points=\"22 7 13.5 15.5 8.5 10.5 2 17\"/><polyline points=\"16 7 22 7 22 13\"/>"
  })),
  wallet: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M21 12V7H5a2 2 0 0 1 0-4h14v4\"/><path d=\"M3 5v14a2 2 0 0 0 2 2h16v-5\"/><path d=\"M18 12a2 2 0 0 0 0 4h4v-4Z\"/>"
  })),
  scale: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"m16 16 3-8 3 8c-2 1.5-4 1.5-6 0Z\"/><path d=\"m2 16 3-8 3 8c-2 1.5-4 1.5-6 0Z\"/><path d=\"M7 21h10\"/><path d=\"M12 3v18\"/><path d=\"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2\"/>"
  })),
  percent: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<line x1=\"19\" y1=\"5\" x2=\"5\" y2=\"19\"/><circle cx=\"6.5\" cy=\"6.5\" r=\"2.5\"/><circle cx=\"17.5\" cy=\"17.5\" r=\"2.5\"/>"
  })),
  pie: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M21.21 15.89A10 10 0 1 1 8 2.83\"/><path d=\"M22 12A10 10 0 0 0 12 2v10z\"/>"
  })),
  box: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\"/><polyline points=\"3.27 6.96 12 12.01 20.73 6.96\"/>"
  })),
  google: p => /*#__PURE__*/React.createElement("svg", {
    width: p && p.w || 18,
    height: p && p.w || 18,
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    fill: "#4285F4",
    d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#34A853",
    d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#FBBC05",
    d: "M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#EA4335",
    d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
  })),
  check: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<polyline points=\"20 6 9 17 4 12\"/>"
  })),
  alertTri: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z\"/><line x1=\"12\" y1=\"9\" x2=\"12\" y2=\"13\"/><line x1=\"12\" y1=\"17\" x2=\"12.01\" y2=\"17\"/>"
  })),
  syringe: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"m18 2 4 4\"/><path d=\"m17 7 3-3\"/><path d=\"M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5\"/><path d=\"m9 11 4 4\"/><path d=\"m5 19-3 3\"/><path d=\"m14 4 6 6\"/>"
  })),
  harvest: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M2 22 16 8\"/><path d=\"M11 2c-2 2-3 4-3 7 3 0 5-1 7-3M16 8c2-2 4-3 7-3-1 3-2 5-4 7\"/>"
  })),
  search: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<circle cx=\"11\" cy=\"11\" r=\"8\"/><line x1=\"21\" y1=\"21\" x2=\"16.65\" y2=\"16.65\"/>"
  })),
  download: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"/>"
  })),
  menu: p => /*#__PURE__*/React.createElement(Ic, _extends({}, p, {
    d: "<line x1=\"3\" y1=\"6\" x2=\"21\" y2=\"6\"/><line x1=\"3\" y1=\"12\" x2=\"21\" y2=\"12\"/><line x1=\"3\" y1=\"18\" x2=\"21\" y2=\"18\"/>"
  }))
};
window.RTLIcons = Icons;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/erp/icons.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.ProgressRing = __ds_scope.ProgressRing;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.SidebarNav = __ds_scope.SidebarNav;

__ds_ns.Topbar = __ds_scope.Topbar;

})();
