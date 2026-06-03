---
name: Pure Vitality Design System
colors:
  surface: '#fbf9f9'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e3e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#41493e'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#717a6d'
  outline-variant: '#c0c9bb'
  surface-tint: '#2a6b2c'
  primary: '#00450d'
  on-primary: '#ffffff'
  primary-container: '#1b5e20'
  on-primary-container: '#90d689'
  inverse-primary: '#91d78a'
  secondary: '#286b33'
  on-secondary: '#ffffff'
  secondary-container: '#abf4ac'
  on-secondary-container: '#2e7238'
  tertiary: '#363d33'
  on-tertiary: '#ffffff'
  tertiary-container: '#4d5449'
  on-tertiary-container: '#c1c8ba'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#acf4a4'
  primary-fixed-dim: '#91d78a'
  on-primary-fixed: '#002203'
  on-primary-fixed-variant: '#0c5216'
  secondary-fixed: '#abf4ac'
  secondary-fixed-dim: '#90d792'
  on-secondary-fixed: '#002107'
  on-secondary-fixed-variant: '#07521d'
  tertiary-fixed: '#dee5d6'
  tertiary-fixed-dim: '#c2c9bb'
  on-tertiary-fixed: '#171d14'
  on-tertiary-fixed-variant: '#42493e'
  background: '#fbf9f9'
  on-background: '#1b1c1c'
  surface-variant: '#e3e2e2'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  xxl: 80px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The design system is anchored in the concept of "Freshness through Clarity." It targets health-conscious consumers who value transparency, organic quality, and effortless shopping. The brand personality is **Professional, Organic, and Vital**.

The visual style is **Modern Corporate** with a heavy emphasis on **Minimalism** and **Spaciousness**. By utilizing expansive white space and high-quality product photography, the UI recedes to let the vibrant colors of the fresh produce take center stage. The interface evokes a sense of trust and "clean living" through disciplined alignment, soft edges, and a refreshing, nature-inspired palette.

## Colors
The palette is a functional tribute to nature and purity. 
- **Primary Green (#1B5E20):** A deep, forest-toned green used for high-level branding, primary actions, and semantic "freshness" cues. It provides the necessary contrast for accessibility.
- **Secondary Light Green (#81C784):** Used for accents, success states, and subtle badges.
- **Tertiary Tint (#F1F8E9):** A soft, organic wash used for large surface areas, section backgrounds, and hover states to avoid the sterility of pure white.
- **Neutrals:** A range of grays from `#212121` (Text) to `#F5F5F5` (Borders). 

The default mode is **Light**, reinforcing the themes of cleanliness and daylight markets.

## Typography
This design system uses **Inter** for its exceptional readability and neutral, professional character. The hierarchy is optimized for SEO with clear distinctions between Heading levels.

- **Headlines:** Use tight letter-spacing and bold weights to create impact. `Headline-xl` is reserved for Hero sections.
- **Body:** `Body-md` is the standard for product descriptions. Line heights are generous (1.5x) to prevent eye fatigue during long shopping sessions.
- **Semantic Tags:** Use `label-md` for categories and status badges, often paired with a subtle background tint.

## Layout & Spacing
The system utilizes a **12-column Fluid Grid** with a fixed maximum width of 1280px for desktop to maintain readability.

- **Desktop:** 24px gutters, 80px side margins. Elements reflow into 4-column product grids.
- **Tablet:** 16px gutters, 40px side margins. Elements reflow into 2 or 3-column grids.
- **Mobile:** 16px side margins. Product lists stack or use horizontal carousels to preserve vertical space.

Spacing follows a linear 4px scale. Use `xl` (48px) for vertical section padding to maintain the "spacious" feel requested in the brief.

## Elevation & Depth
Depth is conveyed through **Soft Ambient Shadows** and **Tonal Layering**. 

1.  **Level 0 (Flat):** Main background (#FFFFFF).
2.  **Level 1 (Surface):** Subtle containers use #F9FBF9 with a 1px border (#E0E0E0).
3.  **Level 2 (Raised):** Product cards use a very diffused shadow: `0 4px 20px rgba(27, 94, 32, 0.05)`. This slight green tint in the shadow adds to the organic feel.
4.  **Level 3 (Overlay):** Modals and dropdowns use a more pronounced shadow: `0 12px 32px rgba(0, 0, 0, 0.1)`.

Avoid harsh black shadows; favor depth created through color shifts (e.g., placing a white card on a #F1F8E9 background).

## Shapes
The shape language is consistently **Rounded (Level 2)**. 
- **Product Cards & Containers:** Use a 16px (`rounded-xl` contextually) radius to feel friendly and safe.
- **Buttons & Inputs:** Use a 12px radius. 
- **Badges/Chips:** Use a fully rounded (pill) shape to differentiate from clickable buttons.

This consistent use of curves removes the "industrial" feel and reinforces the organic nature of the grocery products.

## Components
- **Buttons:** Primary buttons use a solid #1B5E20 background with white text. Secondary buttons use a #F1F8E9 background with primary green text. Hover states should involve a slight darkening of the green.
- **Product Cards:** Must feature a large image area with a 16px radius. Price should be bolded using `headline-md`. The "Add to Cart" button should be prominent but not overshadow the product image.
- **Inputs:** Text fields use a 12px radius, a light gray border (#E0E0E0), and the Primary Green for the focus ring.
- **Chips/Categories:** Use the secondary light green for "Active" states and neutral light gray for "Inactive" states.
- **Navigation:** The sticky header should be pure white with a very subtle bottom border. Use the Primary Green for the active link indicator (a 2px bottom bar).
- **SEO Elements:** Breadcrumbs and descriptive footer links should use `label-sm` with a medium-gray color to remain secondary to main content.