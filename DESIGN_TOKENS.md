# Unspool Design System Tokens

> **Source**: [Figma Design File](https://www.figma.com/design/E40A2wZTYZKswjtNw8a4OV/Ensemble?node-id=22-134)

This document provides a reference for the Unspool design system tokens extracted from Figma.

## 📋 Table of Contents

- [Colors](#colors)
- [Typography](#typography)
- [Spacing](#spacing)
- [Usage Examples](#usage-examples)

---

## 🎨 Colors

### Neutral Palette

| Name | Value | Tailwind Class | CSS Variable |
|------|-------|----------------|--------------|
| Neutral 0 (White) | `#ffffff` | `bg-neutral-0` `text-neutral-0` | `--color-neutral-0` |
| Neutral 1 (Off-white) | `#f3f3f3` | `bg-neutral-1` `text-neutral-1` | `--color-neutral-1` |
| Neutral 2 (Light Gray) | `#e5e5e5` | `bg-neutral-2` `text-neutral-2` | `--color-neutral-2` |
| Neutral 3 (Gray) | `#808080` | `bg-neutral-3` `text-neutral-3` | `--color-neutral-3` |
| Neutral 5 (Black) | `#000000` | `bg-neutral-5` `text-neutral-5` | `--color-neutral-5` |

### Brand Colors

#### Source/Primary (Purple)

| Name | Value | Tailwind Class | CSS Variable | Usage |
|------|-------|----------------|--------------|-------|
| Source 5 (Primary) | `#3d00f6` | `bg-source-5` `text-source-5` | `--color-source-5` | Primary buttons, source cards |
| Source 1 (Light) | `#d0c2fd` | `bg-source-1` `text-source-1` | `--color-source-1` | Hover states, backgrounds |

#### Clip/Secondary (Magenta-Purple)

| Name | Value | Tailwind Class | CSS Variable | Usage |
|------|-------|----------------|--------------|-------|
| Clip 5 (Secondary) | `#ac00f6` | `bg-clip-5` `text-clip-5` | `--color-clip-5` | Clip cards, secondary actions |
| Clip 1 (Light) | `#ebc2fd` | `bg-clip-1` `text-clip-1` | `--color-clip-1` | Hover states, backgrounds |

#### Semantic Aliases

For convenience, these aliases are available:

```css
--color-primary: var(--color-source-5)
--color-primary-light: var(--color-source-1)
--color-secondary: var(--color-clip-5)
--color-secondary-light: var(--color-clip-1)
```

---

## ✍️ Typography

**Font Family**: Noto Sans (weights: 400, 500, 600)

### Typography Scale

| Name | Size | Weight | Line Height | Class | Usage |
|------|------|--------|-------------|-------|-------|
| **Title Large** | 18px | 600 (SemiBold) | 100% | `.text-title-lg` | Page titles, major headings |
| **Title Medium** | 16px | 600 (SemiBold) | 100% | `.text-title-med` | Section headings |
| **Title Small** | 14px | 600 (SemiBold) | 100% | `.text-title-sm` | Card titles, labels |
| **Body Medium** | 14px | 500 (Medium) | 100% | `.text-body-med` | Primary body text |
| **Body Small** | 14px | 400 (Regular) | 100% | `.text-body-sm` | Secondary body text |
| **Meta Medium** | 12px | 500 (Medium) | 100% | `.text-meta-med` | Metadata, timestamps |
| **Meta Small** | 12px | 400 (Regular) | 100% | `.text-meta-sm` | Small labels, captions |

### Font Weight Variables

```css
--font-weight-normal: 400    /* Regular */
--font-weight-medium: 500    /* Medium */
--font-weight-semibold: 600  /* SemiBold */
```

---

## 📏 Spacing

Unspool uses a consistent spacing scale for padding, margins, and gaps:

| Name | Value | Tailwind | CSS Variable | Common Use |
|------|-------|----------|--------------|------------|
| XXXXS | 2px | `spacing-1` | `--spacing-xxxxs` | Micro adjustments |
| XXXS | 4px | `spacing-2` | `--spacing-xxxs` | Tight spacing |
| XXS | 6px | `spacing-3` | `--spacing-xxs` | Close spacing |
| XS | 8px | `spacing-4` | `--spacing-xs` | Small gaps |
| Small | 12px | `spacing-6` | `--spacing-small` | Compact layouts |
| Medium | 16px | `spacing-8` | `--spacing-med` | Standard spacing |
| Large | 24px | `spacing-12` | `--spacing-lg` | Generous spacing |
| XL | 32px | `spacing-16` | `--spacing-xl` | Section spacing |
| XXXXL | 80px | `spacing-40` | `--spacing-xxxxl` | Major sections |

### Spacing Usage Examples

```tsx
// Using Tailwind utilities
<div className="p-8 gap-4">  {/* 16px padding, 8px gap */}
  <div className="mb-12">     {/* 24px margin-bottom */}
    ...
  </div>
</div>

// Using CSS variables directly
<div style={{ padding: 'var(--spacing-med)' }}>
  ...
</div>
```

---

## 📐 Other Design Tokens

### Border Radius

```css
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
```

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1)
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1)
```

---

## 💡 Usage Examples

### Example 1: Podcast Card Component

```tsx
export function PodcastCard({ title, episodes }: Props) {
  return (
    <div className="bg-neutral-0 p-8 rounded-lg border border-neutral-2 hover:border-source-5">
      <h3 className="text-title-med text-neutral-5 mb-2">{title}</h3>
      <p className="text-meta-sm text-neutral-3">{episodes} Episodes</p>
    </div>
  );
}
```

### Example 2: Primary Button

```tsx
export function PrimaryButton({ children }: Props) {
  return (
    <button className="bg-source-5 text-neutral-0 text-body-med px-8 py-4 rounded-md hover:opacity-90">
      {children}
    </button>
  );
}
```

### Example 3: Using CSS Variables Directly

```tsx
export function CustomComponent() {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-neutral-1)',
        padding: 'var(--spacing-med)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <h2 style={{ fontFamily: 'var(--font-sans)' }}>
        Content Here
      </h2>
    </div>
  );
}
```

---

## 🔄 Updating Design Tokens

When the Figma design system changes:

1. Update values in `/app/design-tokens.css`
2. Changes automatically propagate throughout the app
3. Update this documentation to reflect changes
4. Test components to ensure visual consistency

---

## 📦 File Locations

- **Design Tokens**: `/app/design-tokens.css`
- **Global Styles**: `/app/globals.css`
- **Documentation**: `/DESIGN_TOKENS.md` (this file)

---

## 🎯 Best Practices

1. **Use Utility Classes**: Prefer Tailwind classes for common patterns
2. **Semantic Colors**: Use `source-5`/`clip-5` for context-specific colors
3. **Typography Classes**: Use `.text-title-lg`, `.text-body-med`, etc. for consistency
4. **Spacing Scale**: Stick to the defined spacing scale (don't use arbitrary values)
5. **CSS Variables**: Use CSS variables when Tailwind utilities aren't sufficient

---

## 🚀 Migration Guide

To update existing components to use the design system:

**Before:**
```tsx
<div className="bg-white text-black p-4 rounded">
  <h3 className="text-lg font-semibold">Title</h3>
</div>
```

**After:**
```tsx
<div className="bg-neutral-0 text-neutral-5 p-8 rounded-lg">
  <h3 className="text-title-lg">Title</h3>
</div>
```

---

**Questions?** Refer to the [Figma file](https://www.figma.com/design/E40A2wZTYZKswjtNw8a4OV/Ensemble?node-id=22-134) or check `/app/design-tokens.css` for the source of truth.

