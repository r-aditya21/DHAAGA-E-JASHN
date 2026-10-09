# Dhaaga-E-Jashn — Visual System V2

## What changed

### Typography
- Stronger editorial hierarchy using Cormorant Garamond for headings.
- Manrope remains the functional/UI font.
- Larger, lighter section headings.
- Tighter display tracking and wider tracking for labels/navigation.
- More restrained body copy sizing and line-height.

### Color
- Deep navy and warm ivory remain the primary palette.
- Gold is now a restrained accent rather than a dominant color.
- Added cream/beige tonal variation for section transitions.

### Hero
- Existing `public/images/hero.jpg` is now used as the hero background.
- Added subtle image parallax.
- Removed the fragile `left-[220px]` ornament positioning hack.
- Added editorial title clip reveal and improved ornament treatment.
- Added subtle scroll cue animation.

### Buttons
- Added directional fill transitions.
- Added small hover lift.
- Gold/navy/ivory interaction states are consistent.

### Product cards
- Subtle image zoom on hover.
- Overlay reveal.
- Wishlist motion.
- Add-to-bag motion.
- Gold underline reveal.
- Swatch hover micro-interaction.

### Page composition
- BrandIntro is restored directly after the hero.
- Story is restored after categories.
- Craftsmanship is restored after the banner.
- Removed the duplicate BrandIntro near the newsletter.

### Accessibility
- Reduced-motion handling is included in CSS and GSAP utilities.
- Existing keyboard/focus behaviour is preserved.

## Important

The product silhouettes remain placeholders. Replace them with real product photography when the clothing designs arrive. The visual system is intentionally independent of those images.

## Main files changed

- `app/globals.css`
- `app/page.tsx`
- `components/Hero.tsx`
- `lib/gsapUtils.ts`

The rest of the existing frontend has been preserved.
