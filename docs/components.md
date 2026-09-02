# Reusable Components

All components live in `frontend/src/components/`.  
Import from the barrel files for convenience:

```ts
import { Button, Input, Badge, Card, Modal, Table, Spinner, Select, Textarea, EventCard } from '@/components/ui';
import { Navbar, PageWrapper, ProtectedRoute } from '@/components/layout';
```

---

## UI Components (`src/components/ui/`)

### Button

Renders a styled `<button>` with variant, size, and loading state.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'ghost'` | `'primary'` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Padding / font size |
| `loading` | `boolean` | `false` | Shows spinner and disables button |
| `disabled` | `boolean` | — | Native disabled |
| `...rest` | `ButtonHTMLAttributes` | — | All native button props |

```tsx
<Button onClick={handleSave}>Save</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="danger" loading={isDeleting}>Delete</Button>
<Button variant="ghost">Back</Button>
```

---

### Input

Labelled text input with optional error and helper text.

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Renders a `<label>` above the input |
| `error` | `string` | Red error message below input |
| `helperText` | `string` | Grey hint text (hidden when `error` is set) |
| `...rest` | `InputHTMLAttributes` | All native input props |

```tsx
<Input label="Email" type="email" placeholder="you@example.com" />
<Input label="Name" error="Name is required" />
<Input label="Capacity" type="number" helperText="Maximum attendees" />
```

---

### Select

Labelled dropdown with an optional placeholder option.

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Renders a `<label>` |
| `options` | `{ value: string; label: string }[]` | Dropdown options |
| `placeholder` | `string` | Empty first option |
| `error` | `string` | Red error message |

```tsx
<Select
  label="Category"
  placeholder="Select a category"
  options={[
    { value: 'workshop', label: 'Workshop' },
    { value: 'networking', label: 'Networking' },
  ]}
/>
```

---

### Textarea

Multi-line text input with label and error support.

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Renders a `<label>` |
| `error` | `string` | Red error message |
| `helperText` | `string` | Grey hint text |
| `...rest` | `TextareaHTMLAttributes` | All native textarea props |

```tsx
<Textarea label="Description" rows={6} placeholder="Describe the event…" />
```

---

### Badge

Inline pill label for statuses, roles, categories.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'purple'` | `'default'` | Colour scheme |

```tsx
<Badge variant="success">Published</Badge>
<Badge variant="warning">Pending Approval</Badge>
<Badge variant="danger">Cancelled</Badge>
<Badge variant="info">Completed</Badge>
<Badge variant="purple">Organizer</Badge>
```

---

### Card

Composable container with optional Header, Body, and Footer sub-components.

| Prop | Type | Description |
|------|------|-------------|
| `onClick` | `() => void` | Makes card clickable with hover shadow |

```tsx
<Card>
  <Card.Header>
    <h2>Event Title</h2>
  </Card.Header>
  <Card.Body>
    <p>Event details go here.</p>
  </Card.Body>
  <Card.Footer>
    <Button size="sm">Register</Button>
  </Card.Footer>
</Card>
```

---

### Modal

Accessible dialog with backdrop, Escape-to-close, and scroll lock.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | — | Controls visibility |
| `onClose` | `() => void` | — | Called on backdrop click or Escape |
| `title` | `string` | — | Header title (also shows close ✕ button) |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Max width |

```tsx
const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Open Modal</Button>

<Modal open={open} onClose={() => setOpen(false)} title="Confirm Registration">
  <p>Are you sure you want to register for this event?</p>
  <div className="flex gap-2 mt-4">
    <Button onClick={handleConfirm}>Confirm</Button>
    <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
  </div>
</Modal>
```

---

### Table

Generic typed table with loading and empty states.

| Prop | Type | Description |
|------|------|-------------|
| `columns` | `{ key: string; header: string; render?: (row) => ReactNode }[]` | Column definitions |
| `data` | `T[]` (must have `id: string`) | Row data |
| `loading` | `boolean` | Shows loading row |
| `emptyMessage` | `string` | Message when data is empty |

```tsx
<Table
  columns={[
    { key: 'name',  header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role',  header: 'Role', render: row => <Badge>{row.role}</Badge> },
    { key: 'actions', header: '', render: row => (
      <Button size="sm" variant="ghost" onClick={() => handleEdit(row.id)}>Edit</Button>
    )},
  ]}
  data={users}
  loading={isLoading}
  emptyMessage="No users found."
/>
```

---

### Spinner

Animated loading indicator.

| Prop | Type | Default |
|------|------|---------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |

```tsx
<Spinner />
<Spinner size="sm" />

// Full-page loading state
{isLoading && (
  <div className="flex justify-center py-16">
    <Spinner size="lg" />
  </div>
)}
```

---

### EventCard

Pre-built card for displaying an event summary in a list. Wraps in a `<Link>` to `/events/:id`.

| Prop | Type | Description |
|------|------|-------------|
| `event` | `Event` | Event object from `@/types/event` |

```tsx
import type { Event } from '@/types/event';

{events.map(event => <EventCard key={event.id} event={event} />)}
```

Displays: title, status badge, description, date, venue, price, and available capacity.

---

## Layout Components (`src/components/layout/`)

### Navbar

Top navigation bar. Reads the current user from `AuthContext` and renders role-appropriate links.  
No props required — just render it.

```tsx
<Navbar />
```

Role → links mapping:

| Role | Links |
|------|-------|
| ATTENDEE | Events |
| ORGANIZER | Events, Dashboard |
| VENDOR | Events, Dashboard |
| ADMIN | Events, Admin |
| PLATFORM_ADMIN | Settings |
| MANAGEMENT | Reports |

---

### PageWrapper

Wraps a page with `<Navbar>` and a centred content area. Use this in every page component.

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Optional `<h1>` rendered above content |

```tsx
export default function EventList() {
  return (
    <PageWrapper title="Upcoming Events">
      {/* page content */}
    </PageWrapper>
  );
}
```

---

### ProtectedRoute

Route guard that redirects unauthenticated users to `/login` and unauthorised roles to `/`.

| Prop | Type | Description |
|------|------|-------------|
| `roles` | `UserRole[]` | Allowed roles for the route |

```tsx
// In App.tsx (already configured)
<Route element={<ProtectedRoute roles={['ORGANIZER']} />}>
  <Route path="/organizer" element={<OrganizerDashboard />} />
</Route>
```

---

## Tailwind CSS

Components use [Tailwind CSS](https://tailwindcss.com/) utility classes.  
Make sure Tailwind is installed and configured in `vite.config.ts` / `tailwind.config.js`.

Install if not already present:

```bash
npm install -D tailwindcss @tailwindcss/vite
```

---

## Adding New Components

1. Create `src/components/ui/MyComponent.tsx`
2. Export it from `src/components/ui/index.ts`
3. Document it in this file following the same format