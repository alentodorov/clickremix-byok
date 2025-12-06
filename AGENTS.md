## Frontend guidelines for agents

- The popup and extension UI are built with Tailwind + Basecoat, a React-free shadcn clone; follow existing patterns and classnames.
- Use Basecoat components for these UI elements: Accordion, Alert(+Dialog), Avatar, Badge, Breadcrumb, Button(+Group), Card, Checkbox, Combobox, Command, Dialog, Dropdown Menu, Empty, Field, Form, Input(+Group), Item, Kbd, Label, Pagination, Popover, Progress, Radio Group, Select, Sidebar, Skeleton, Slider, Spinner, Switch, Table, Tabs, Textarea, Theme Switcher, Toast, Tooltip. If you don't know the class ask the user or visit: http://basecoatui.com/
- Prefer Tailwind utility classes for sizing/spacing/overrides instead of adding new stylesheet rules. If a new utility is needed, justify it clearly.
- Alpine.js is used for popup/extension state. Register components with Alpine data helpers (CSP-safe build) and prefer declarative bindings over manual DOM scripting.

### Alpine.js CSP Mode Constraints

**IMPORTANT**: The extension uses Alpine.js CSP build (`alpinejs-csp.esm.js`), which has stricter parsing requirements:

- **NO optional chaining (`?.`)** in template expressions (x-text, :placeholder, etc.)
  - ❌ Bad: `x-text="obj?.prop || ''"`
  - ✅ Good: `x-text="obj ? obj.prop : ''"`

- **NO nullish coalescing (`??`)** in template expressions
  - ❌ Bad: `x-text="value ?? 'default'"`
  - ✅ Good: `x-text="value !== null && value !== undefined ? value : 'default'"`

- **Use ternary operators** instead of mixing `&&` and `||` with property access
  - ❌ Bad: `x-text="obj && obj.prop || ''"`
  - ✅ Good: `x-text="obj ? obj.prop : ''"`

- **Prefer simple expressions** - complex logic should go in component methods, not templates

If you see `CSP Parser Error: Unexpected token: PUNCTUATION`, check for these patterns in Alpine.js template bindings.
