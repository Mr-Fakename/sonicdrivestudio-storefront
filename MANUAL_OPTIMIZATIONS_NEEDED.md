# Manual Optimizations Required

This document outlines optimization tasks that require external tools or manual intervention.

## 🔤 Font Optimization (High Priority)

### Current State
- Font: Geometos.ttf (TTF format)
- Location: `/public/fonts/Geometos.ttf`
- Status: ✅ Preload added in layout.tsx

### Required Actions

**1. Convert TTF to WOFF2**
```bash
# Option A: Use online converter
https://everythingfonts.com/ttf-to-woff2

# Option B: Use glyphhanger (npm package)
npx glyphhanger --subset=public/fonts/Geometos.ttf --formats=woff2

# Option C: Use fonttools
pip install fonttools brotli
pyftsubset public/fonts/Geometos.ttf --output-file=public/fonts/Geometos.woff2 --flavor=woff2
```

**2. Subset Font (Remove Unused Characters)**
```bash
# Subset to Latin only (0-255 Unicode range)
npx glyphhanger --whitelist=U+0-FF --subset=public/fonts/Geometos.ttf --formats=woff2
```

**3. Update font declaration in layout.tsx**
```typescript
const geometos = localFont({
	src: [
		{
			path: "../../public/fonts/Geometos.woff2",
			weight: "400",
			style: "normal",
		},
	],
	variable: "--font-geometos",
	display: "swap",
	fallback: ["Arial", "Helvetica", "sans-serif"],
	adjustFontFallback: "Arial",
	preload: true,
});
```

**4. Update preload link**
```tsx
<link
	rel="preload"
	href="/fonts/Geometos.woff2"
	as="font"
	type="font/woff2"
	crossOrigin="anonymous"
/>
```

**Expected Impact:**
- File size reduction: ~30%
- FCP improvement: ~200ms
- Eliminate FOUT (flash of unstyled text)

---

## 🖼️ Image Optimization (Critical Priority)

### Current Issues

**Accessibility (Critical):**
- Only 9 out of 352 files have alt text (2.5% coverage)
- Fails WCAG 2.1 AA compliance
- Poor screen reader support

**Performance (High Priority):**
- No explicit width/height (causes CLS - Cumulative Layout Shift)
- No blur placeholders
- No priority loading for above-fold images
- No responsive sizes configuration

### Files Requiring Alt Text

Run this command to find all images without alt text:
```bash
find src -name "*.tsx" -exec grep -l "<Image" {} \; | while read file; do
  if ! grep -q "alt=" "$file"; then
    echo "$file - MISSING ALT TEXT"
  fi
done
```

### Required Actions

**1. Add Alt Text to ALL Images**

Priority files (based on earlier audit):
- `src/ui/components/ProductElement.tsx`
- `src/ui/components/ProductCardEnhanced.tsx`
- `src/app/(main)/products/[slug]/page.tsx`
- `src/app/(main)/cart/CartItem.tsx`
- `src/checkout/sections/Summary/SummaryItem.tsx`
- `src/ui/components/OrderListItem.tsx`
- `src/ui/components/Logo.tsx`
- `src/ui/components/nav/components/UserMenu/components/UserAvatar.tsx`

**Example Fix:**
```typescript
// Bad:
<Image src={url} />

// Good:
<Image
  src={product.thumbnail.url}
  alt={product.thumbnail.alt || `${product.name} product image`}
  width={800}
  height={800}
/>
```

**2. Add Explicit Dimensions to ALL Images**

```typescript
<Image
  src={imageUrl}
  alt={altText}
  width={800}  // ✅ Add this
  height={800} // ✅ Add this
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px"
/>
```

**3. Implement Priority Loading for LCP Image**

Find the hero/above-fold image (likely in homepage or product page) and add:

```typescript
<Image
  src={heroImage}
  alt="Hero image description"
  width={1920}
  height={1080}
  priority // ✅ Add this for above-fold images
  loading="eager" // ✅ Add this
  fetchPriority="high" // ✅ Add this
/>
```

**4. Add Blur Placeholders**

Generate blur data URLs for images:

```typescript
// Option A: Use plaiceholder
import { getPlaiceholder } from "plaiceholder";

const { base64 } = await getPlaiceholder(imageUrl);

<Image
  src={imageUrl}
  alt={altText}
  width={800}
  height={800}
  placeholder="blur"
  blurDataURL={base64}
/>

// Option B: Simple blur
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#333" offset="20%" />
      <stop stop-color="#222" offset="50%" />
      <stop stop-color="#333" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#333" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str);

<Image
  ...
  placeholder="blur"
  blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(700, 475))}`}
/>
```

**5. Preload LCP Image**

In layout.tsx or page.tsx, add:

```tsx
<link
  rel="preload"
  as="image"
  href="/hero-image.webp"
  imageSrcSet="/hero-320.webp 320w, /hero-640.webp 640w, /hero-1024.webp 1024w"
  imageSizes="100vw"
/>
```

### Expected Impact

**Accessibility:**
- Lighthouse Accessibility: 75 → 95+
- WCAG 2.1 AA compliance achieved
- Screen reader compatibility: Excellent

**Performance:**
- CLS reduction: ~80-90% (from unknown to <0.1)
- LCP improvement: ~10-20%
- Perceived performance: Significantly better with blur placeholders

---

## 📋 Implementation Checklist

### Phase 1 (Immediate - 1 day)
- [ ] Convert Geometos.ttf to WOFF2
- [ ] Subset font to Latin characters only
- [ ] Update font declaration in layout.tsx
- [ ] Update preload link to use WOFF2
- [ ] Add alt text to top 10 most-visited pages
- [ ] Add explicit dimensions to hero/LCP images

### Phase 2 (This week - 3 days)
- [ ] Add alt text to remaining 40+ image files
- [ ] Add dimensions to all images
- [ ] Implement priority loading for above-fold images
- [ ] Add blur placeholders to product images

### Phase 3 (Next week - 2 days)
- [ ] Implement art direction with `<picture>` for responsive images
- [ ] Add lazy loading with intersection observer margin
- [ ] Optimize image sizes (compress, resize for actual display sizes)
- [ ] Generate 2x images for retina displays

---

## 🧪 Testing After Implementation

**Font Testing:**
```bash
# Check font file size
ls -lh public/fonts/

# Test font loading in browser DevTools
# Network tab → filter by "font" → verify WOFF2 loads
```

**Image Testing:**
```bash
# Check for missing alt text
npm run lint -- --rule 'jsx-a11y/alt-text: error'

# Check Lighthouse scores
npx @lhci/cli autorun --collect.numberOfRuns=3

# Measure CLS
# Open Chrome DevTools → Performance → Record → Check CLS metric
```

**Accessibility Testing:**
```bash
# Install axe DevTools extension
# Run accessibility audit
# Check for image alt text violations
```

---

## 📊 Expected Results

### Before Optimization
- Bundle Size: Unknown
- Font Load Time: ~300-500ms (TTF)
- Images: No alt text (2.5% coverage)
- CLS: Unknown (likely >0.25)
- Lighthouse Accessibility: Unknown (likely <80)

### After Optimization
- Bundle Size: -30% for fonts
- Font Load Time: ~100-200ms (WOFF2)
- Images: 100% alt text coverage
- CLS: <0.1 (Good)
- Lighthouse Accessibility: 95+ (Excellent)
- FCP: -200ms improvement
- LCP: -10-20% improvement

---

## 🔗 Useful Tools

**Font Conversion:**
- [Everything Fonts](https://everythingfonts.com/ttf-to-woff2)
- [Font Squirrel](https://www.fontsquirrel.com/tools/webfont-generator)
- [glyphhanger](https://github.com/zachleat/glyphhanger)

**Image Optimization:**
- [Squoosh](https://squoosh.app/) - Image compression
- [TinyPNG](https://tinypng.com/) - PNG/JPEG optimization
- [ImageOptim](https://imageoptim.com/) - Mac app for image optimization
- [plaiceholder](https://plaiceholder.co/) - Blur placeholder generation

**Testing:**
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Web Vitals Extension](https://chrome.google.com/webstore/detail/web-vitals/ahfhijdlegdabablpippeagghigmibma)
- [axe DevTools](https://www.deque.com/axe/devtools/)

---

**Note:** These optimizations are critical for Phase 1 completion. The font conversion and image alt text additions should be prioritized as they have the highest impact on Core Web Vitals and accessibility scores.
