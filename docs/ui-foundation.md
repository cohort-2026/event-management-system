# UI Foundation

**File:** `frontend/src/index.css`  
**Styling system:** Tailwind CSS v4 (via `@tailwindcss/vite`) with a custom `@theme` block for design tokens.

---

## Overview

All design tokens are defined once in `index.css` using Tailwind v4's `@theme` directive. This means every token is available as a Tailwind utility class automatically — no separate config file is needed. Global base styles and layout utility classes are also defined here so every developer starts from the same foundation.

---

## Styling Approach

| Decision | Choice | Reason |
|---|---|---|
| CSS framework | Tailwind CSS v4 | Already installed; utility-first keeps styles co-located with components |
| Token system | CSS custom properties via `@theme` | Single source of truth; tokens are available as both CSS variables and Tailwind classes |
| Config file | None (Tailwind v4 uses `@theme` in CSS) | Tailwind v4 no longer requires `tailwind.config.js` |
| Component styles | Tailwind utility classes inline | Consistent with existing components (Button, Card, Input, etc.) |
| Global styles | `index.css` only | `App.css` is cleared; all base styles live in one place |

---

## Colours

### Brand (Indigo) — primary actions, links, focus rings, navbar

| Token | CSS variable | Hex | Tailwind class |
|---|---|---|---|
| Brand 50 | `--color-brand-50` | `#eef2ff` | `bg-brand-50` |
| Brand 100 | `--color-brand-100` | `#e0e7ff` | `bg-brand-100` |
| Brand 200 | `--color-brand-200` | `#c7d2fe` | `bg-brand-200` |
| Brand 500 | `--color-brand-500` | `#6366f1` | `text-brand-500` |
| Brand 600 | `--color-brand-600` | `#4f46e5` | `bg-brand-600` — **main brand colour** |
| Brand 700 | `--color-brand-700` | `#4338ca` | `hover:bg-brand-700` |
| Brand 900 | `--color-brand-900` | `#312e81` | `bg-brand-900` |

### Neutral (Warm Grey) — all text, borders, surfaces

Replaces Tailwind's cool `gray-*` scale. Slightly warm tone looks more premium with event imagery.

| Token | Hex | Use |
|---|---|---|
| `neutral-50` | `#fafaf9` | Page background |
| `neutral-100` | `#f5f5f4` | Table header, sunken inputs |
| `neutral-200` | `#e7e5e4` | Borders |
| `neutral-300` | `#d6d3d1` | Strong borders |
| `neutral-400` | `#a8a29e` | Placeholder text, disabled |
| `neutral-500` | `#78716c` | Secondary text |
| `neutral-600` | `#57534e` | Body text |
| `neutral-700` | `#44403c` | Sub-headings |
| `neutral-800` | `#292524` | Headings |
| `neutral-900` | `#1c1917` | High-contrast text |

### Purple — vendor roles & badges

| Token | Hex | Use |
|---|---|---|
| `purple-50` | `#faf5ff` | Badge background |
| `purple-100` | `#f3e8ff` | Hover tint |
| `purple-600` | `#9333ea` | Badge text, vendor icons |
| `purple-700` | `#7e22ce` | Hover |

### Amber — pending/awaiting states

| Token | Hex | Use |
|---|---|---|
| `amber-50` | `#fffbeb` | Badge background |
| `amber-100` | `#fef3c7` | Stronger tint |
| `amber-600` | `#d97706` | Badge text, warning icons |
| `amber-700` | `#b45309` | Hover |

### Emerald — published/confirmed/success states

| Token | Hex | Use |
|---|---|---|
| `emerald-50` | `#ecfdf5` | Badge background |
| `emerald-100` | `#d1fae5` | Stronger tint |
| `emerald-600` | `#059669` | Badge text, success icons |
| `emerald-700` | `#047857` | Hover |

### Rose — destructive/cancelled states

| Token | Hex | Use |
|---|---|---|
| `rose-50` | `#fff1f2` | Badge/error background |
| `rose-100` | `#ffe4e6` | Stronger tint |
| `rose-600` | `#e11d48` | Danger button, error text |
| `rose-700` | `#be123c` | Hover |

### Sky — informational states

| Token | Hex | Use |
|---|---|---|
| `sky-50` | `#f0f9ff` | Badge background |
| `sky-100` | `#e0f2fe` | Stronger tint |
| `sky-600` | `#0284c7` | Badge text, info icons |
| `sky-700` | `#0369a1` | Hover |

### Semantic Surfaces

| Token | CSS variable | Value | Use |
|---|---|---|---|
| Surface | `--color-surface` | `#ffffff` | Cards, modals, inputs |
| Surface subtle | `--color-surface-subtle` | `#fafaf9` | Page background (warm) |
| Surface sunken | `--color-surface-sunken` | `#f5f5f4` | Table rows, read-only inputs |
| Surface raised | `--color-surface-raised` | `#ffffff` | Elevated cards |

### Semantic Text

| Token | CSS variable | Value | Use |
|---|---|---|---|
| Text primary | `--color-text-primary` | `#1c1917` | Headings, body |
| Text secondary | `--color-text-secondary` | `#78716c` | Descriptions, labels |
| Text disabled | `--color-text-disabled` | `#a8a29e` | Disabled states |
| Text inverse | `--color-text-inverse` | `#ffffff` | Text on dark backgrounds |

### Status Colours (WCAG AA on white)

Used by the `Badge` component and inline status indicators.

| Status | Background | Text | Badge variant |
|---|---|---|---|
| Success | `#ecfdf5` | `#166534` | `success` |
| Warning | `#fffbeb` | `#92400e` | `warning` |
| Danger | `#fff1f2` | `#9f1239` | `danger` |
| Info | `#f0f9ff` | `#1e40af` | `info` |

### Badge Variant → Colour Mapping

| Variant | Background class | Text class | Used for |
|---|---|---|---|
| `default` | `bg-neutral-100` | `text-neutral-700` | Draft, unknown |
| `success` | `bg-emerald-50` | `text-emerald-700` | Published, confirmed |
| `warning` | `bg-amber-50` | `text-amber-700` | Pending approval |
| `danger` | `bg-rose-50` | `text-rose-700` | Cancelled, error |
| `info` | `bg-sky-50` | `text-sky-700` | Completed, informational |
| `purple` | `bg-purple-50` | `text-purple-700` | Vendor role |
| `amber` | `bg-amber-100` | `text-amber-700` | Awaiting payment |

---

## Typography

### Font Families

| Token | CSS variable | Stack |
|---|---|---|
| Sans (default) | `--font-sans` | `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| Mono | `--font-mono` | `ui-monospace, "Cascadia Code", Consolas, monospace` |

System fonts are used intentionally — no external font load, no FOUT, fast on all devices.

### Type Scale

| Token | CSS variable | Size | Use |
|---|---|---|---|
| xs | `--text-xs` | 12px | Captions, badges |
| sm | `--text-sm` | 14px | Labels, table cells, helper text |
| base | `--text-base` | 16px | Body text (default) |
| lg | `--text-lg` | 18px | Lead text |
| xl | `--text-xl` | 20px | Sub-headings (h4) |
| 2xl | `--text-2xl` | 24px | Section headings (h3) |
| 3xl | `--text-3xl` | 30px | Page headings (h1) |
| 4xl | `--text-4xl` | 36px | Hero headings |

### Font Weights

| Token | CSS variable | Value |
|---|---|---|
| Normal | `--font-weight-normal` | 400 |
| Medium | `--font-weight-medium` | 500 |
| Semibold | `--font-weight-semibold` | 600 |
| Bold | `--font-weight-bold` | 700 |

### Line Heights

| Token | CSS variable | Value | Use |
|---|---|---|---|
| Tight | `--leading-tight` | 1.25 | Headings |
| Snug | `--leading-snug` | 1.375 | Sub-headings |
| Normal | `--leading-normal` | 1.5 | Default |
| Relaxed | `--leading-relaxed` | 1.625 | Body paragraphs |

---

## Spacing

4px base unit. All spacing tokens are multiples of 4px.

| Token | CSS variable | Value |
|---|---|---|
| 1 | `--spacing-1` | 4px |
| 2 | `--spacing-2` | 8px |
| 3 | `--spacing-3` | 12px |
| 4 | `--spacing-4` | 16px |
| 5 | `--spacing-5` | 20px |
| 6 | `--spacing-6` | 24px |
| 8 | `--spacing-8` | 32px |
| 10 | `--spacing-10` | 40px |
| 12 | `--spacing-12` | 48px |
| 16 | `--spacing-16` | 64px |

---

## Border Radius

| Token | CSS variable | Value | Use |
|---|---|---|---|
| sm | `--radius-sm` | 4px | Badges, small elements |
| md | `--radius-md` | 6px | Inputs, buttons |
| lg | `--radius-lg` | 8px | Cards |
| xl | `--radius-xl` | 12px | Modals, large panels |
| full | `--radius-full` | 9999px | Pills, avatars |

---

## Shadows

| Token | CSS variable | Use |
|---|---|---|
| sm | `--shadow-sm` | Subtle card lift |
| md | `--shadow-md` | Cards on hover |
| lg | `--shadow-lg` | Modals, dropdowns |

---

## Responsive Behaviour

### Breakpoints

| Name | Token | Width | Target |
|---|---|---|---|
| sm | `--breakpoint-sm` | 640px | Large phones (landscape) |
| md | `--breakpoint-md` | 768px | Tablets |
| lg | `--breakpoint-lg` | 1024px | Laptops |
| xl | `--breakpoint-xl` | 1280px | Desktops |

### Strategy

- Mobile-first: base styles target small screens; `md:` and `lg:` prefixes add complexity upward.
- The `Navbar` collapses to a hamburger menu below `md` (768px).
- The `page-container` utility adjusts horizontal padding at each breakpoint.
- The `card-grid` utility switches from 1 → 2 → 3 columns at `sm` → `lg`.

---

## Layout Utilities

These utility classes are defined in `index.css` under `@layer utilities` and are available everywhere.

### `page-container`

Centres content, enforces `max-width: 1280px`, and applies responsive horizontal padding.

```tsx
<main className="page-container section-gap">
  {/* page content */}
</main>
```

| Breakpoint | Padding |
|---|---|
| Default (mobile) | 16px |
| sm (640px+) | 24px |
| lg (1024px+) | 32px |

### `section-gap` / `section-gap-lg`

Vertical padding for page sections.

| Class | Padding |
|---|---|
| `section-gap` | 32px top + bottom |
| `section-gap-lg` | 48px top + bottom |

### `card-grid`

Responsive CSS grid for event/item listings.

```tsx
<div className="card-grid">
  {events.map(e => <EventCard key={e.id} event={e} />)}
</div>
```

| Breakpoint | Columns |
|---|---|
| Default (mobile) | 1 |
| sm (640px+) | 2 |
| lg (1024px+) | 3 |

### `form-stack`

Vertical flex layout for form fields with consistent gap.

```tsx
<form className="form-stack">
  <Input label="Title" />
  <Textarea label="Description" />
  <Button type="submit">Save</Button>
</form>
```

### `sr-only`

Visually hides content while keeping it accessible to screen readers.

---

## Global Base Styles

The following are applied globally in `index.css`:

- `box-sizing: border-box` on all elements
- `font-family`, `font-size`, `line-height`, `color`, `background-color` on `html`
- `-webkit-font-smoothing: antialiased` for crisp text rendering
- `margin: 0` on `body`; `min-height: 100dvh` and `display: flex; flex-direction: column` on `#root`
- Heading elements (`h1`–`h6`) reset `margin: 0` and set appropriate sizes from the type scale
- `p` elements reset `margin: 0` and use `--color-text-secondary`
- `a` elements use `--color-brand-600` with hover state
- `:focus-visible` uses a 2px `--color-brand-500` outline for keyboard accessibility
- Subtle custom scrollbar styles (WebKit)

---

## Navbar

`frontend/src/components/layout/Navbar.tsx`

- Sticky at the top (`sticky top-0 z-40`)
- Height: `h-14` (56px) — matches `--navbar-height: 3.5rem`
- Desktop (≥768px): horizontal link row + user info
- Mobile (<768px): hamburger button → slide-down menu panel
- Uses `page-container` for consistent horizontal alignment with page content

---

## PageWrapper

`frontend/src/components/layout/PageWrapper.tsx`

Wraps every page with `<Navbar>` and a `<main>` that uses `page-container section-gap` for consistent layout.

```tsx
export default function MyPage() {
  return (
    <PageWrapper title="Page Title">
      {/* content */}
    </PageWrapper>
  );
}
```

---

## Testing on Multiple Screen Sizes

Verify the foundation at these widths using browser DevTools:

| Width | What to check |
|---|---|
| 375px (iPhone SE) | Hamburger menu visible; single-column card grid; no horizontal overflow |
| 640px | Card grid switches to 2 columns |
| 768px | Hamburger replaced by desktop nav |
| 1024px | Card grid switches to 3 columns; full padding |
| 1280px | Container hits max-width; content centred |

---

## Adding to the Foundation

- New colour: add a `--color-*` variable to the `@theme` block in `index.css`.
- New utility class: add it to the `@layer utilities` block in `index.css`.
- New component: use existing Tailwind utility classes; reference tokens via `var(--token-name)` only when a utility class doesn't exist.
- Do not create a separate CSS file per component — keep all global tokens and utilities in `index.css`.
