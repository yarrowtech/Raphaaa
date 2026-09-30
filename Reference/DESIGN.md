---
name: Luxe Retail Platform
colors:
  surface: '#faf9fb'
  surface-dim: '#dbd9dc'
  surface-bright: '#faf9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f5'
  surface-container: '#efedef'
  surface-container-high: '#e9e8ea'
  surface-container-highest: '#e3e2e4'
  on-surface: '#1b1c1d'
  on-surface-variant: '#444748'
  inverse-surface: '#303032'
  inverse-on-surface: '#f2f0f2'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#bb0013'
  on-secondary: '#ffffff'
  secondary-container: '#e41e24'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#00201c'
  on-tertiary-container: '#2b9385'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#ffdad6'
  secondary-fixed-dim: '#ffb4ab'
  on-secondary-fixed: '#410002'
  on-secondary-fixed-variant: '#93000d'
  tertiary-fixed: '#94f4e3'
  tertiary-fixed-dim: '#77d7c8'
  on-tertiary-fixed: '#00201c'
  on-tertiary-fixed-variant: '#005048'
  background: '#faf9fb'
  on-background: '#1b1c1d'
  surface-variant: '#e3e2e4'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  brand-title:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.02em
  product-desc:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  price-current:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
  price-strikethrough:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  price-discount:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-badge:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.25rem
  margin: 1rem
  margin-desktop: 2rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2.5rem
---

## Brand & Style

This design system establishes a high-conversion, editorial-grade fashion and lifestyle e-commerce interface. Inspired by high-volume yet curated platforms like Myntra and minimal fashion destinations like SSENSE, the visual language balances commercial density with refined luxury. 

The aesthetic is Modern Minimalist: clean architectural lines, airy neutral canvases, crisp typography, and disciplined pops of color for urgent merchandising cues (such as sale tags, ratings, and active filter states). 

Primary design attributes:
- **Utilitarian Elegance:** High density without visual fatigue. Clear margins, crisp hairline rules, and structured grid cards let apparel photography take center stage.
- **Micro-Interactions over Heavy FX:** Hover zoom cues, subtle wishlist toggle state transitions, and responsive sorting drop-downs replace heavy drop shadows and decorative gradients.
- **Editorial Legibility:** Strict typographic scale distinguishing brand houses from product descriptions and price tiers at glance level.

## Colors

The color palette prioritizes neutral backdrops to accentuate apparel imagery, supported by functional semantic highlights:

- **Primary (`#111111`):** Deep carbon black used for headlines, active brand names, primary call-to-actions, and emphasized price points.
- **Secondary (`#E11B22`):** Vibrant promotional vermilion/crimson used exclusively for markdown percentages, flash sale tags, clearance badges, and critical inventory indicators.
- **Tertiary (`#0D8275`):** Deep emerald teal utilized for customer social proof, particularly star rating badges, verified purchaser tags, and eco-conscious apparel tags.
- **Neutral Palette:**
  - Base Background: `#FFFFFF` (Surface) and `#FAFAFA` (App canvas and sidebar backgrounds).
  - Subtle Dividing Lines / Borders: `#EEEEEE`.
  - Secondary Copy & Counts: `#707072` (e.g., filter item quantities, original strikethrough prices, item counters).
  - Muted Text / Placeholders: `#94969F`.
  - Soft Badge Fill: `#F5F5F6` or 8% opacity tint of parent highlight.

## Typography

Plus Jakarta Sans powers the entire typographic hierarchy, chosen for its contemporary geometric form, open counters, and high legibility at micro sizes.

Typographic Rules:
- **Brand Names (`brand-title`):** Rendered in weight 700 with uppercase transformation or clean title case, providing immediate brand recognition.
- **Product Descriptions (`product-desc`):** Muted slate `#707072` in standard body weight, single-line truncated with ellipsis to guarantee grid symmetry.
- **Price Hierarchy:** Three-tiered pricing: current selling price in bold `#111111`, original retail price in strikethrough `#94969F`, and markdown percentage in accent coral/red `#E11B22`.
- **Breadcrumbs & Category Headers:** Clear lowercase path navigation with neutral dividers (`/`), paired with uppercase section headings (`headline-md`) in the sidebar filters.

## Layout & Spacing

The layout model uses a responsive fluid grid optimized for high-volume browsing, search, and granular filtering:

- **Desktop Layout (≥ 1280px):**
  - **Sidebar:** Fixed width of 260px for sticky facet navigation (Categories, Brand, Price sliders, Color swatches, Discount filters).
  - **Product Grid:** Responsive multi-column layout (4 or 5 columns on ultra-wide screens) with `gutter-desktop` (20px) element spacing.
  - **Top Bar:** Quick-filter dropdown pills (Bundles, Country of Origin, Size) horizontally aligned with a right-aligned sort dropdown.
- **Tablet (768px - 1279px):** 3-column product grid with collapsible off-canvas filter drawer. Margins set to 1.5rem.
- **Mobile (< 768px):** 2-column compact grid, sticky bottom bar for "Sort" and "Filter", and 0.5rem (8px) gutters between product cards to maximize visual real estate.

## Elevation & Depth

This design system avoids heavy shadows, instead relying on tonal distinction, subtle hairline outlines, and crisp layering:

- **Base Surfaces:** Pure `#FFFFFF` card containers set against `#FFFFFF` or `#FAFAFA` gallery canvas.
- **Separation & Outlines:** Low-contrast `1px solid #EEEEEE` borders delimit headers, sidebar filter divisions, and product card boundaries.
- **Overlays & Floating Badges:** Product rating tags and discount markers float over image containers using semi-opaque background blurs (`backdrop-filter: blur(4px); background-color: rgba(255, 255, 255, 0.85);`).
- **Hover Transitions:** On product card mouseover, cards transition slightly upward (translate-y of -2px) accompanied by a subtle ambient diffusion: `box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.08);`.

## Shapes

The design system employs a refined, slightly softened modern radius scale (`roundedness: 1`):

- **Image Thumbnails & Product Cards:** 4px (`0.25rem`) corner radius, maintaining structural grid alignment while feeling polished rather than sharp.
- **Action Buttons & Dropdowns:** 4px radius for a tailored, architectural silhouette.
- **Filter Tags & Badges:** Rating badges, pills, and color swatches leverage slightly rounded corners (4px) or full circular pills (9999px) strictly for color swatch selection circles.

## Components

### Product Cards
- **Structure:** Aspect ratio 3:4 or 4:5 image container with vertical product metadata pinned directly below.
- **Rating Overlay:** Floating pill on the bottom-left corner of the image (`0.25rem` radius, white background with border `#EAEAEC`). Displays the numeric score, an SVG star filled with `#0D8275`, a fine vertical separator `|`, and the total rating volume count in `#707072`.
- **Wishlist Action:** Heart icon positioned in the top-right overlay, inactive `#111111` outline, shifting to filled `#E11B22` on activation.

### Filter Facets & Sidebar
- **Sections:** Categories, Brand, Price, Color, and Discount Range separated by `1px solid #EEEEEE` top borders.
- **Search within Facets:** Search input with embedded magnifying glass icon (`#94969F`) for brands with extensive catalogs.
- **Checkboxes:** Custom square checkboxes (16x16px) with a 2px radius and 1.5px border `#D4D5D9`. Active state fills with `#E11B22` with a white checkmark. Item count counts in parentheses render in `#94969F`.
- **Color Swatches:** Circular 14px indicators beside color names, displaying literal hex fills with a subtle `#E0E0E0` outer ring for white/light swatches.

### Top Controls & Chips
- **Quick Facet Dropdowns:** Pill buttons with light grey borders (`#D4D5D9`), chevron indicators, and count badges for applied options.
- **Sort Select:** Clean right-aligned dropdown containing options like "Recommended", "Price: Low to High", "Better Discount", and "Customer Rating".

### Buttons & CTAs
- **Primary:** `#111111` solid background, `#FFFFFF` text, font weight 700, 4px corner radius.
- **Secondary / Wishlist:** `#FFFFFF` background, `1px solid #D4D5D9`, hover state `#F5F5F6`.
- **Promo Badges:** Pill with soft coral-red wash (`rgba(225, 27, 34, 0.08)`) and bold `#E11B22` text.