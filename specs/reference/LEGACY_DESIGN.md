---
name: Artisanal Confectionery Operating System
colors:
  surface: '#fff8f6'
  surface-dim: '#ffcfc5'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0ee'
  surface-container: '#ffe9e5'
  surface-container-high: '#ffe2dc'
  surface-container-highest: '#ffdad3'
  on-surface: '#3e0500'
  on-surface-variant: '#58413c'
  inverse-surface: '#621001'
  inverse-on-surface: '#ffede9'
  outline: '#8c716b'
  outline-variant: '#dfbfb8'
  surface-tint: '#a9371a'
  primary: '#a63518'
  on-primary: '#ffffff'
  primary-container: '#c74c2e'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4a2'
  secondary: '#5f6044'
  on-secondary: '#ffffff'
  secondary-container: '#e4e5c1'
  on-secondary-container: '#65664a'
  tertiary: '#735457'
  on-tertiary: '#ffffff'
  tertiary-container: '#8e6c70'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad2'
  primary-fixed-dim: '#ffb4a2'
  on-primary-fixed: '#3c0700'
  on-primary-fixed-variant: '#881f04'
  secondary-fixed: '#e4e5c1'
  secondary-fixed-dim: '#c8c9a7'
  on-secondary-fixed: '#1b1d07'
  on-secondary-fixed-variant: '#47482f'
  tertiary-fixed: '#ffd9dd'
  tertiary-fixed-dim: '#e5bdc1'
  on-tertiary-fixed: '#2c1518'
  on-tertiary-fixed-variant: '#5c3f43'
  background: '#fff8f6'
  on-background: '#3e0500'
  surface-variant: '#ffdad3'
typography:
  display-hero:
    fontFamily: Poppins
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Poppins
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Poppins
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Poppins
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
  title-lg:
    fontFamily: Gaegu
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  title-md:
    fontFamily: Gaegu
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Gaegu
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Gaegu
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Gaegu
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
  label-numeric:
    fontFamily: Poppins
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  label-code:
    fontFamily: Poppins
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  label-badge:
    fontFamily: Gaegu
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an editorial-vintage yet operationally precise aesthetic tailored for high-craft pastry, custom bakery operations, and executive dessert management. It bridges the warm, tactile sensory pleasure of boutique baking with the rigorous clarity demanded by production schedules, Bill of Materials (BOM), and multi-channel order fulfillment.

### Design Movement & Aesthetic
- **Editorial Modern-Heritage:** Playful, rounded geometric display typography paired with organic, handwritten-style body fonts and crisp geometric labels for dense operational data tables.
- **Tactile Papercraft & Notebook Ephemera:** Warm cream textured canvas backdrops (`#F6F6D2`), spiral-bound card motifs, perforated ticket tabs for batch tickets, and rounded rectangular framed containers reminiscent of bespoke menus and French patisserie packaging.
- **Chambered Editorial Framing:** Generous curved containment frames (24px to 32px inner radii), floating circular culinary badges, and distinct tonal nesting that isolates complex operational states into approachable, bite-sized tasks.
- **Emotional Resonance:** Conveys culinary prestige, reassuring warmth, and uncompromising logistical order—deliberately steering clear of cold, clinical enterprise ERPs while maintaining peak data density and clarity.

## Colors

The palette draws directly from patisserie baking tones, natural botanical dyes, and vintage gastronomic print:

- **Primary (`#DE5D3D` - Vibrant Terracotta / Coral Punch):** The primary focal point for critical interactive triggers (`+ New Order`, primary CTA buttons, dynamic badges, active tab underlines). Evokes warmth, sweetness, and urgency.
- **Secondary (`#F6F6D2` - Warm Cream / Parchment Tone):** Grounding, sophisticated soft contrast tone used for primary executive module bars, hero banner frames, and deep focal panels.
- **Tertiary (`#FDD3D7` - Soft Powder Pink):** Gentle highlight tint for secondary cards, subtle notification pills, selected inventory rows, and customer sweet-tier indicators.
- **Neutral (`#9E3B26` - Burnt Terracotta / Rich Earth):** Replaces harsh pure black for all body typography, line dividers, and high-legibility tabular figures. Ensures a soft, organic reading tone across parchment surfaces.

### Semantic & Operational Color Logic
- **`surface-cream` (`#F6F6D2`):** Primary canvas background for the entire application, mitigating visual fatigue during extended inventory and order logging sessions.
- **`burnt-terracotta` (`#9E3B26`):** Hover, active, and pressed states for elements; accent border strokes on ticket headers.
- **Status Colors:**
  - `status-healthy` (`#2E7D32`): BOM ingredients sufficient, payments verified, healthy margins.
  - `status-attention` (`#E65100`): Low inventory thresholds, pre-orders almost full, partial invoices.
  - `status-critical` (`#C62828`): Stock shortages, overdue invoices, production blockers.

## Typography

The typographic hierarchy harmonizes editorial grandeur with structured data entry:

- **Display & Headline Roles (`Poppins`):** Delivers a clean, friendly geometric presence inspired by modern pastry branding. Used strictly for executive KPI summaries, major modal/page headlines, and landing section titles.
- **Structural Interface & Body Roles (`Gaegu`):** Provides a warm, handwritten character that emphasizes the artisanal, boutique baking experience across recipe scaling views, customer profiles, and order tables.
- **Operational Data & Code Roles (`Poppins`):** Applied to transactional IDs (`ORD-202610-000001`, `INV-001`), SKU barcodes, currency figures, BOM weights (e.g. `450.00 g`), and WhatsApp deep-link generation strings to ensure high legibility.

## Layout & Spacing

The layout is built upon an intentional, rhythmic dual-layer model:

### Grid Architecture
- **Desktop (1200px+):** 12-column fluid grid with `1.25rem` (20px) gutters and max-width clamping at 1440px. The sidebar/sub-navigation docks left (260px fixed width), while the operational workboard scrolls independently.
- **Tablet (768px - 1199px):** 8-column layout with `1rem` gutters. Cards reflow from horizontal summary splits into 2-column stacked operational tiles.
- **Mobile (< 768px):** 4-column layout with `1rem` safe margins. Dedicated sticky bottom action sheet for fast-order inputs and WhatsApp direct-trigger buttons.

### Spacing Philosophy
- Layout structures follow an 8pt base grid (`space-xs` = 4px, `space-sm` = 8px, `space-md` = 16px, `space-lg` = 24px, `space-xl` = 40px).
- Internal card padding is consistently `1.5rem` (24px) on desktop and `1rem` (16px) on mobile cards to keep table data dense without claustrophobia.

## Elevation & Depth

Visual depth eschews generic cold drop shadows in favor of warm, tactile, paper-stack ambient tiers:

- **Canvas Foundation (Base):** `#F6F6D2` textured or solid warm cream base layer.
- **Tonal Layer 1 (Standard Card Container):** `#FFFFFF` or pale warm parchment surface with an ultra-soft ambient blur: `box-shadow: 0 4px 20px -2px rgba(158, 59, 38, 0.05), 0 1px 3px rgba(158, 59, 38, 0.08)`.
- **Tonal Layer 2 (Floating Badges & Dish Cutouts):** Circular floating imagery and batch status pills utilize an elevated tactile shadow: `box-shadow: 0 8px 24px -4px rgba(158, 59, 38, 0.12)`.
- **Tonal Layer 3 (Modals, Slide-over Drawers & WhatsApp Previews):** Deep backdrop blur (`backdrop-filter: blur(8px)`) with a warm tinted veil (`rgba(158, 59, 38, 0.2)`), and surface shadow: `box-shadow: 0 20px 48px -8px rgba(158, 59, 38, 0.22)`.
- **Ghost Borders:** Cards feature a delicate structural border of `1px solid rgba(158, 59, 38, 0.08)` to maintain boundary definition on high-brightness screens.

## Shapes

The design uses a defined hierarchy of rounded corners reflecting vintage curved menus and patisserie pastry display cases:

- **Standard Containers & Cards (`roundedness: 2` = 0.5rem / 8px):** Used on data table containers, filter drop-downs, and inline inputs.
- **Hero Modules & Ticket Frames (`rounded-xl` = 1.5rem to 2rem / 24px to 32px):** Top-level dashboard hero banners and showcase cards feature large sweeping rounded corners that echo the signature Vesta dining presentation aesthetic.
- **Spiral Notebook Details:** Batch recipe cards and production run sheets feature decorative notched edge perforations or left-hand spiral ring markers (6px circular cutouts spaced at 24px intervals along the left border).
- **Floating Dish & Dessert Badges:** Fully circular (`rounded-full` / 50% radius) containers with 2px cream inner borders for recipe and plating photos.

## Components

### 1. Buttons & Quick Action Triggers
- **Primary Action (e.g., `+ New Order`, `Confirm Batch`):** Solid `#DE5D3D` background, text `#FFFFFF`, font `Poppins` 14px bold, padding `10px 20px`, `rounded-full` or 8px corners. Hover: `#9E3B26`. Includes trailing circle icon with a forward micro-arrow.
- **Secondary Action (e.g., `Export BOM`, `Filter Inactive`):** Ghost button with `1.5px` border in `#F6F6D2`, text `#9E3B26`, background transparent. Hover: background tinted `rgba(246, 246, 210, 0.2)`.
- **Tertiary Utility (e.g., WhatsApp Link):** Surface of `#E8F5E9`, text `#2E7D32`, border `1px solid #A5D6A7`.

### 2. Status Chips & Workflow Badges
- Compact capsules (`rounded-full`, padding `3px 10px`, font `label-badge` uppercase).
- **Healthy / In Stock / Paid:** Background `#E8F5E9`, text `#1B5E20`.
- **Attention / Low Stock / Waiting Payment:** Background `#FFF3E0`, text `#E65100`.
- **Critical / Out of Stock / Overdue:** Background `#FFEBEE`, text `#C62828`.
- **In Production:** Background `#FDD3D7`, text `#9E3B26` with a pulsing dot indicator.

### 3. Notebook / Ticket Batch Cards
- White cards set on the `#F6F6D2` canvas with a perforated dashed divider separating the customer header from the ingredient list.
- Left-side notch styling mimicking spiral bakery production sheets.
- Prominent display of `ORD-ID` in `Poppins` at the top right corner.

### 4. Input Fields & Recipe Calculation Steppers
- Input surfaces utilize `#FFFFFF` with `1.5px` border in `rgba(158, 59, 38, 0.15)`. Focus state: border color `#DE5D3D` with a subtle `2px` ring in `#FDD3D7`.
- Numeric ingredient multiplier fields include increment/decrement stepper handles designed for tablet touch targets (minimum 44x44px hit area).

### 5. Data Tables (Orders, Inventory & Purchasing)
- Header rows styled in uppercase `Poppins` (11px), background `#EFEEC2`, text `#9E3B26` with `0.05em` letter spacing.
- Alternate row striping using `rgba(255, 255, 255, 0.6)` and `transparent`. Row hover activates a soft `#FDD3D7` (15% opacity) highlight.
- Numerical values (costs, weights, portions) right-aligned using `label-numeric`.

### 6. Destructive Confirmation Modal
- Centered dialogue with an arched top frame, rich earth text, clear itemized summary of the record being cancelled/deleted, and an unmistakable `#C62828` confirm button flanked by a warm neutral cancel option.