---
name: Organic Harvest
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#42493e'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#72796e'
  outline-variant: '#c2c9bb'
  surface-tint: '#3b6934'
  primary: '#154212'
  on-primary: '#ffffff'
  primary-container: '#2d5a27'
  on-primary-container: '#9dd090'
  inverse-primary: '#a1d494'
  secondary: '#006e1c'
  on-secondary: '#ffffff'
  secondary-container: '#91f78e'
  on-secondary-container: '#00731e'
  tertiary: '#3a3935'
  on-tertiary: '#ffffff'
  tertiary-container: '#51504b'
  on-tertiary-container: '#c5c2bc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bcf0ae'
  primary-fixed-dim: '#a1d494'
  on-primary-fixed: '#002201'
  on-primary-fixed-variant: '#23501e'
  secondary-fixed: '#94f990'
  secondary-fixed-dim: '#78dc77'
  on-secondary-fixed: '#002204'
  on-secondary-fixed-variant: '#005313'
  tertiary-fixed: '#e5e2db'
  tertiary-fixed-dim: '#c9c6c0'
  on-tertiary-fixed: '#1c1c18'
  on-tertiary-fixed-variant: '#474742'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 30px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 22px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 48px
  margin-mobile: 16px
---

## Brand & Style

The design system is centered on the concept of "Pure Vitality." It aims to evoke the sensory experience of a fresh morning market: crisp, clean, and life-giving. The target audience consists of health-conscious consumers and families who value transparency, sustainability, and quality in their food sources.

The aesthetic follows a **Minimalist** approach with **Soft Modernist** influences. By prioritizing expansive white space and high-quality food photography, the UI steps back to let the natural colors of the produce provide the primary visual interest. The emotional response should be one of trust, calm, and appetite appeal, localized specifically for the Vietnamese market through thoughtful typography and cultural resonance.

## Colors

The palette is rooted in the natural world. 
- **Primary Green (#2D5A27):** A deep, forest green used for headers, primary actions, and brand-critical elements to convey authority and the "organic" promise.
- **Secondary Green (#4CAF50):** A vibrant, leaf-green used for accents, success states, and badges to evoke growth and freshness.
- **Earth Tone (#F4F1EA):** A soft, sandy beige used for section backgrounds and card containers to prevent the UI from feeling "sterile" or overly clinical.
- **Neutral Background (#FFFFFF / #F9FAFB):** High-reflectance whites ensure that product photography pops and the interface feels breathable.

## Typography

This design system utilizes **Be Vietnam Pro** for its entire typographic hierarchy. As a font family designed with the Vietnamese language in mind, it handles complex diacritics with grace while maintaining a contemporary, friendly, and approachable feel.

Headlines should use tighter letter spacing and heavier weights to create a sense of groundedness. Body text utilizes a generous line height (1.6) to ensure maximum readability for nutritional information and product descriptions. All localized Vietnamese text should maintain these standards to ensure a premium, curated editorial feel.

## Layout & Spacing

The layout utilizes a **Fluid Grid** system with a focus on asymmetrical balance to mimic the organic nature of produce. 

- **Desktop:** A 12-column grid with 24px gutters. Product listings typically span 3 or 4 columns.
- **Tablet:** An 8-column grid with 20px gutters.
- **Mobile:** A 4-column grid with 16px margins. 

Spacing is based on an 8px base unit. Large sections of content should be separated by substantial vertical padding (64px to 80px) to maintain the minimalist, airy aesthetic. Elements should never feel "cramped"; when in doubt, increase padding to allow the organic shapes of the imagery to breathe.

## Elevation & Depth

Visual hierarchy is established through **Ambient Shadows** and **Tonal Layering**. 

1. **Surface Base:** Pure white (#FFFFFF) for the primary background.
2. **Surface Low:** Soft earth-toned backgrounds (#F4F1EA) to group related content without adding visual weight.
3. **Soft Depth:** Components like cards use a very subtle, diffused shadow: `0px 4px 20px rgba(45, 90, 39, 0.05)`. This shadow uses a hint of the primary green to keep the depth feeling organic rather than synthetic grey.
4. **Interactive States:** On hover, cards may lift slightly with a more pronounced shadow, but should never use heavy outlines or harsh borders.

## Shapes

The shape language is **Rounded (Level 2)**. This level of curvature (0.5rem / 8px base) avoids the clinical feel of sharp corners while remaining structured enough for an e-commerce platform. 

- **Product Images:** Use `rounded-xl` (1.5rem / 24px) to soften the photography.
- **Secondary Buttons & Inputs:** Use the standard `rounded` (0.5rem / 8px).
- **Search Bars & Badges:** May utilize pill-shaped ends to denote high interactivity and friendly navigation.

## Components

### Buttons
- **Primary:** Solid Primary Green (#2D5A27) with white text. High-contrast, bold, and reliable.
- **Secondary:** Outline Primary Green or solid Earth Tone. Used for "Add to Cart" or "View Details."
- **States:** Hover states should involve a subtle shift to a slightly darker shade or a gentle scale increase (1.02x).

### Product Cards
Cards are the heart of the system. They feature a large image area with a `rounded-xl` corner radius, a clean title in Be Vietnam Pro Bold, and the price highlighted in the Secondary Green. Avoid borders; use a soft ambient shadow to separate the card from the background.

### Input Fields & Selectors
Text inputs use a light grey or earth-tone background with a subtle 1px border that turns Primary Green on focus. Labels sit clearly above the field in `label-sm` style.

### Category Chips
Small, rounded elements used for filtering (e.g., "Rau củ," "Trái cây," "Đồ khô"). Active states use a soft tint of the Secondary Green with dark green text.

### Feedback Elements
- **Success:** Secondary Green (#4CAF50).
- **Warning:** A warm, organic orange (reminiscent of a carrot or citrus).
- **Error:** A soft brick red, used sparingly to maintain the calm atmosphere.