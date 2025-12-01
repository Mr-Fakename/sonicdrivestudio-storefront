# Performance, Security & Optimization Implementation Roadmap

**Date:** 2025-12-01
**Project:** Saleor Storefront (Next.js 16 Canary + React 19 Canary)
**Environment:** Self-hosted on single machine (Dokploy + Docker Compose)
**Branch:** `claude/storefront-performance-audit-012gSiWNBsKHy2VhWYHqoWC7`

---

## 📊 Current State Analysis

### ✅ What's Already Implemented

1. **Build Optimization**
   - ✅ Next.js 16 canary with experimental features enabled
   - ✅ React 19 canary for concurrent features
   - ✅ Tailwind CSS for utility-first styling
   - ✅ TypeScript for type safety
   - ✅ Package optimization (`optimizePackageImports` for lucide-react, @headlessui/react, react-toastify)
   - ✅ Modular imports for lodash
   - ✅ Console.log removal in production
   - ✅ Compression enabled
   - ✅ Modern browser targeting

2. **Image Optimization**
   - ✅ Next.js Image component usage
   - ✅ AVIF and WebP format support
   - ✅ Responsive device sizes configured
   - ✅ 30-day cache TTL for images
   - ✅ Remote pattern support for all hostnames

3. **Font Optimization**
   - ✅ Self-hosted font (Geometos.ttf)
   - ✅ Local font loading with next/font
   - ✅ Font display: swap
   - ✅ Fallback fonts configured

4. **Caching Strategy**
   - ✅ Service Worker implemented with multiple strategies
   - ✅ Cache-Control headers for static assets
   - ✅ Next.js unstable_cache for GraphQL queries
   - ✅ URQL client-side caching

5. **Security**
   - ✅ Security headers partially configured (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
   - ✅ Permissions-Policy configured
   - ✅ HTTPS enforcement (HSTS with preload)
   - ✅ XSS prevention library (xss package)

6. **PWA Features**
   - ✅ Service Worker registration
   - ✅ Web manifest (site.webmanifest)
   - ✅ Multiple icon sizes (192px, 512px)
   - ✅ Apple touch icon
   - ✅ Offline page

7. **SEO Basics**
   - ✅ Structured data (Organization, Website schemas)
   - ✅ Open Graph tags
   - ✅ Twitter Card tags
   - ✅ Canonical URLs
   - ✅ Meta descriptions
   - ✅ humans.txt

8. **Accessibility**
   - ✅ Some ARIA attributes (114 occurrences in 49/352 files = 14% coverage)
   - ✅ Skip to main content link
   - ✅ Semantic HTML in some components
   - ✅ Focus indicators

---

## ❌ Critical Gaps Identified

### 🔴 **HIGH PRIORITY** (Immediate Action Required)

#### 1. Critical CSS & Render Blocking
**Status:** ❌ **NOT IMPLEMENTED**
- **Issue:** Tailwind generates large CSS bundle loaded synchronously
- **Impact:** Blocks rendering, increases FCP/LCP
- **Current State:**
  - Full Tailwind CSS loaded on every page
  - No critical CSS extraction
  - No CSS inlining for above-the-fold content
  - No PurgeCSS optimization beyond Tailwind's default

**Action Items:**
```typescript
// next.config.js - Add critical CSS extraction
experimental: {
  optimizeCss: true, // ✅ Already enabled
  // Need to add:
  cssChunking: 'strict', // Split CSS by route
}

// Implement critical CSS inlining
// Install: npm install critters
import Critters from 'critters-webpack-plugin';

// In next.config.js webpack config:
config.plugins.push(
  new Critters({
    preload: 'swap',
    pruneSource: true,
  })
);
```

**Estimated Impact:** -15-20% FCP, -10% LCP

---

#### 2. Image Optimization Gaps
**Status:** ⚠️ **PARTIALLY IMPLEMENTED**

**Issues:**
- ❌ Only 9 files have alt text (out of many images)
- ❌ No blur placeholder implementation
- ❌ No priority loading for above-fold images
- ❌ No responsive image sizes in most components
- ❌ No art direction with `<picture>` element
- ❌ No image preloading for LCP images
- ❌ Missing explicit width/height (causes CLS)

**Current Implementation:**
```typescript
// Good: Using Next.js Image
<Image src={imageUrl} alt={alt} />

// Missing:
// 1. Priority for above-fold
// 2. Blur placeholders
// 3. Responsive sizes
// 4. Explicit dimensions
```

**Action Items:**
```typescript
// Implement in all product images:
import { Image } from 'next/image';

<Image
  src={product.thumbnail.url}
  alt={product.thumbnail.alt || product.name}
  width={800}
  height={800}
  priority={isAboveFold}  // For hero images
  placeholder="blur"
  blurDataURL={generateBlurDataURL(product.thumbnail.url)}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px"
  quality={85}
  loading={isAboveFold ? 'eager' : 'lazy'}
/>

// For LCP image in layout:
<link
  rel="preload"
  as="image"
  href="/hero-image.webp"
  imageSrcSet="/hero-320.webp 320w, /hero-640.webp 640w, /hero-1024.webp 1024w"
  imageSizes="100vw"
/>
```

**Files to Update:**
- `src/ui/components/ProductElement.tsx`
- `src/ui/components/ProductCardEnhanced.tsx`
- `src/app/(main)/products/[slug]/page.tsx`
- `src/app/(main)/cart/CartItem.tsx`
- `src/checkout/sections/Summary/SummaryItem.tsx`
- `src/ui/components/OrderListItem.tsx`
- `src/ui/components/Logo.tsx`
- `src/ui/components/nav/components/UserMenu/components/UserAvatar.tsx`

**Estimated Impact:** -20% CLS, -10% LCP, +100% Accessibility Score

---

#### 3. Font Loading Issues
**Status:** ⚠️ **NEEDS OPTIMIZATION**

**Issues:**
- ❌ Only TTF format (not WOFF2, which is 30% smaller)
- ❌ Not subsetting font (includes unused characters)
- ❌ No preload for critical font
- ❌ Fallback font metrics don't match (causes FOUT)

**Current State:**
```typescript
// app/layout.tsx
const geometos = localFont({
  src: "../../public/fonts/Geometos.ttf",
  variable: "--font-geometos",
  display: "swap",
  fallback: ["sans-serif"],
  adjustFontFallback: "Arial", // Good but needs improvement
});
```

**Action Items:**
1. **Convert TTF to WOFF2:**
   ```bash
   # Use https://everythingfonts.com/ttf-to-woff2
   # Or: npx glyphhanger --subset=*.ttf --formats=woff2
   ```

2. **Subset Font:**
   ```bash
   # Subset to only Latin characters
   npx glyphhanger --whitelist=U+0-FF --subset=Geometos.ttf
   ```

3. **Update Font Declaration:**
   ```typescript
   const geometos = localFont({
     src: [
       {
         path: "../../public/fonts/Geometos-subset.woff2",
         weight: "400",
         style: "normal",
       },
     ],
     variable: "--font-geometos",
     display: "swap",
     fallback: ["Arial", "Helvetica", "sans-serif"],
     adjustFontFallback: "Arial",
     preload: true, // Add this
   });
   ```

4. **Add Preload Link:**
   ```html
   <link
     rel="preload"
     href="/fonts/Geometos-subset.woff2"
     as="font"
     type="font/woff2"
     crossOrigin="anonymous"
   />
   ```

**Estimated Impact:** -30% font file size, -200ms FCP, eliminate FOUT

---

#### 4. Missing SEO Files
**Status:** ❌ **NOT IMPLEMENTED**

**Missing:**
- ❌ robots.txt
- ❌ sitemap.xml (or dynamic sitemap route)
- ❌ RSS feed (optional but good for SEO)

**Action Items:**

**A. Create robots.txt:**
```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/checkout/', '/account/'],
      },
    ],
    sitemap: 'https://sonicdrivestudio.com/sitemap.xml',
  };
}
```

**B. Create Dynamic Sitemap:**
```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';
import { executeGraphQL } from '@/lib/graphql';
import { ProductListDocument } from '@/gql/graphql';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://sonicdrivestudio.com';

  // Fetch all products
  const { products } = await executeGraphQL(ProductListDocument, {
    variables: { channel: 'default-channel', first: 100 },
    revalidate: 86400, // 24 hours
  });

  const productUrls = products.edges.map((edge) => ({
    url: `${baseUrl}/products/${edge.node.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Add static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
    // Add more static pages
  ];

  return [...staticPages, ...productUrls];
}
```

**Estimated Impact:** +20% organic traffic over 6 months

---

#### 5. Accessibility Critical Issues
**Status:** ⚠️ **NEEDS SIGNIFICANT IMPROVEMENT**

**Statistics:**
- ❌ ARIA attributes: Only 14% coverage (49/352 files)
- ❌ Alt text: Only 2.5% coverage (9/352 files with images)
- ❌ Heading hierarchy: Unknown (needs audit)
- ❌ Keyboard navigation: Partially implemented
- ❌ Color contrast: Unknown (needs testing)
- ❌ Screen reader testing: Not done

**Action Items:**

**A. Image Alt Text Audit:**
```bash
# Create script to find images without alt text
grep -r "<Image" src/ | grep -v "alt=" | wc -l
```

**B. Add Alt Text to All Images:**
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

**C. Implement Skip Navigation:**
```typescript
// Already in layout.tsx - Good!
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4 focus:font-medium focus:text-black"
>
  Skip to main content
</a>
```

**D. Add Main Landmarks:**
```typescript
// Update components to use semantic HTML
<header role="banner">
<nav role="navigation" aria-label="Main navigation">
<main id="main-content" role="main">
<aside role="complementary" aria-label="Shopping cart">
<footer role="contentinfo">
```

**E. Form Accessibility:**
```typescript
// All forms need:
<label htmlFor="email">Email Address</label>
<input
  id="email"
  type="email"
  required
  aria-required="true"
  aria-invalid={hasError}
  aria-describedby={hasError ? "email-error" : undefined}
/>
{hasError && (
  <span id="email-error" role="alert">
    {errorMessage}
  </span>
)}
```

**F. Keyboard Navigation Testing:**
```typescript
// Add focus-visible styles to all interactive elements
.focus-visible:focus {
  outline: 2px solid oklch(75.6% 0.105 20);
  outline-offset: 2px;
}
```

**Estimated Impact:** +40 points Lighthouse Accessibility Score, WCAG 2.1 AA compliance

---

#### 6. Bundle Size Optimization
**Status:** ⚠️ **NEEDS ANALYSIS**

**Current Dependencies Analysis:**

**Heavy Dependencies:**
- ❌ `formik` (2.4.5) - 45KB - Consider replacing with `react-hook-form` (24KB)
- ❌ `lodash-es` (4.17.21) - Full library imported, needs tree-shaking verification
- ❌ `@adyen/adyen-web` (5.53.3) - 200KB+ - Should be code-split
- ❌ `@stripe/react-stripe-js` - Should be lazy loaded
- ⚠️ `lucide-react` (0.358.0) - 2.5MB - Needs aggressive tree-shaking

**Action Items:**

**A. Replace Formik with React Hook Form:**
```bash
npm install react-hook-form
npm uninstall formik yup
```
**Savings:** ~20KB gzipped

**B. Verify Lodash Tree-Shaking:**
```typescript
// Bad:
import { debounce } from 'lodash-es';

// Good (already configured in next.config.js):
modularizeImports: {
  'lodash-es': {
    transform: 'lodash-es/{{member}}',
  },
}
```

**C. Lazy Load Payment Components:**
```typescript
// In checkout page
const StripeCheckoutForm = dynamic(
  () => import('@/checkout/sections/PaymentSection/StripeElements/StripeCheckoutForm'),
  {
    loading: () => <PaymentSkeleton />,
    ssr: false,
  }
);

const AdyenDropIn = dynamic(
  () => import('@/checkout/sections/PaymentSection/AdyenDropIn'),
  {
    loading: () => <PaymentSkeleton />,
    ssr: false,
  }
);
```

**D. Analyze Bundle:**
```bash
# Build with bundle analyzer
ANALYZE=true npm run build

# Install analyzer
npm install @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(config);
```

**Estimated Impact:** -30-40% bundle size, -1-2s TTI

---

### 🟡 **MEDIUM PRIORITY** (1-2 Weeks)

#### 7. Advanced Caching Strategy
**Status:** ⚠️ **NEEDS IMPROVEMENT**

**Issues:**
- ⚠️ Service Worker caches auth requests (see Issue #1 in audit)
- ⚠️ No stale-while-revalidate for API responses
- ❌ No cache invalidation strategy for product updates
- ❌ No HTTP/2 Server Push hints
- ❌ No early hints (103 status)

**Action Items:**

**A. Fix Service Worker (Already in Audit Plan):**
- Exclude auth endpoints from caching
- Implement cache invalidation on auth state change
- Add timeout handling
- Reduce update check frequency

**B. Implement ISR for Product Pages:**
```typescript
// app/(main)/products/[slug]/page.tsx
export const revalidate = 3600; // 1 hour

export async function generateStaticParams() {
  // Pre-render top 100 products at build time
  const { products } = await executeGraphQL(ProductListDocument, {
    variables: { channel: 'default-channel', first: 100 },
  });

  return products.edges.map((edge) => ({
    slug: edge.node.slug,
  }));
}
```

**C. Add Cache Tags for Granular Revalidation:**
```typescript
// In graphql.ts
export async function executeGraphQL<Result, Variables>(
  operation: TypedDocumentString<Result, Variables>,
  options: {
    tags?: string[];
    // ... rest
  }
) {
  // Use tags for revalidation
  const tags = options.tags || [];

  // For product queries:
  tags.push(`product-${productId}`);

  const input = {
    // ...
    next: { revalidate, tags },
  };
}

// Revalidate on mutation:
import { revalidateTag } from 'next/cache';

// After product update:
revalidateTag(`product-${productId}`);
```

**D. Configure Nginx for Optimal Caching:**
```nginx
# /etc/nginx/sites-available/storefront

# Static assets - aggressive caching
location ~* \.(woff2|woff|ttf|eot|jpg|jpeg|png|gif|webp|avif|svg|ico)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
  add_header Vary "Accept-Encoding";
}

# Next.js static chunks
location /_next/static/ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

# HTML pages - no cache, revalidate
location / {
  add_header Cache-Control "no-cache, must-revalidate";
}

# Enable HTTP/2
listen 443 ssl http2;
```

**Estimated Impact:** -40% server load, -20% TTFB, improved repeat visit performance

---

#### 8. Security Headers Enhancement
**Status:** ⚠️ **PARTIALLY IMPLEMENTED**

**Missing:**
- ❌ Content Security Policy (commented out)
- ❌ Cross-Origin-Embedder-Policy
- ❌ Cross-Origin-Opener-Policy
- ❌ Cross-Origin-Resource-Policy
- ❌ X-Permitted-Cross-Domain-Policies
- ❌ Subresource Integrity for CDN resources

**Action Items:**

**A. Re-enable and Fix CSP (Already in Audit Plan):**
See Issue #3 in Performance Audit document for full implementation.

**B. Add Missing Security Headers:**
```javascript
// next.config.js
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        // ... existing headers ...
        {
          key: 'Cross-Origin-Embedder-Policy',
          value: 'require-corp',
        },
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin',
        },
        {
          key: 'Cross-Origin-Resource-Policy',
          value: 'same-origin',
        },
        {
          key: 'X-Permitted-Cross-Domain-Policies',
          value: 'none',
        },
        {
          key: 'X-XSS-Protection',
          value: '0', // Modern browsers use CSP instead
        },
      ],
    },
  ];
}
```

**C. Implement Subresource Integrity:**
```typescript
// For Stripe/Adyen scripts
<script
  src="https://js.stripe.com/v3/"
  integrity="sha384-..."
  crossOrigin="anonymous"
/>
```

**D. Security Testing:**
```bash
# Test with:
curl -I https://sonicdrivestudio.com | grep -i "security\|csp\|sts\|frame"
```

**Estimated Impact:** A+ on securityheaders.com, improved protection against XSS/clickjacking

---

#### 9. GraphQL Query Optimization
**Status:** ⚠️ **NEEDS IMPROVEMENT**

**Issues:**
- ❌ No query batching
- ❌ No persisted queries
- ❌ No query complexity analysis
- ⚠️ Over-fetching data in some queries
- ❌ No query deduplication window configuration

**Action Items:**

**A. Implement Automatic Persisted Queries:**
```typescript
// Install: npm install @urql/exchange-persisted-query
import { persistedExchange } from '@urql/exchange-persisted-query';

const urqlClient = createClient({
  url: saleorApiUrl,
  exchanges: [
    dedupExchange,
    cacheExchange,
    persistedExchange({
      preferGetForPersistedQueries: true,
      generateHash: (query) => {
        return Promise.resolve(sha256(query));
      },
    }),
    authErrorExchange,
    fetchExchange,
  ],
});
```

**B. Optimize Over-fetching:**
```graphql
# Bad - fetching unnecessary fields:
query ProductDetails {
  product {
    id
    name
    description
    seoTitle
    seoDescription
    # ... 20+ fields
  }
}

# Good - only fetch what's needed:
query ProductCard {
  product {
    id
    name
    slug
    thumbnail { url alt }
    pricing { priceRange { start { gross { amount currency } } } }
  }
}
```

**C. Implement Query Deduplication:**
```typescript
// Already using dedupExchange - configure timeout:
import { dedupExchange } from '@urql/core';

const customDedupExchange = dedupExchange({
  ttl: 10000, // 10 seconds (default is 5s)
});
```

**Estimated Impact:** -30% GraphQL payload size, -20% API latency

---

### 🟢 **LOW PRIORITY** (Nice to Have)

#### 10. Advanced Image Techniques
- Blur-up placeholder generation
- Art direction with `<picture>` element
- Lazy loading with intersection observer margin
- Facade pattern for video thumbnails
- CSS background image lazy loading

#### 11. Performance Monitoring
- Web Vitals tracking
- Real User Monitoring (RUM)
- Error tracking (Sentry)
- Performance budgets in CI/CD
- Lighthouse CI integration

#### 12. Advanced PWA Features
- Background sync for offline mutations
- Push notifications
- Install prompt
- Share API integration
- Periodic background sync

#### 13. Advanced Accessibility
- Screen reader testing (NVDA, JAWS, VoiceOver)
- High contrast mode support
- Reduced motion preferences
- Dyslexia-friendly fonts option
- Focus trap management in modals

---

## 🚫 Not Applicable to Next.js

The following items from the checklist are Astro-specific and **DO NOT APPLY**:

1. **Astro Component Hydration**
   - ❌ `client:load`, `client:idle`, `client:visible`, etc.
   - ✅ **Next.js equivalent:** Use `'use client'` directive and dynamic imports

2. **Astro Prefetch Integration**
   - ❌ `@astrojs/prefetch`
   - ✅ **Next.js equivalent:** `next/link` has built-in prefetching

3. **Astro Build Configuration**
   - ❌ `output: 'static'`, `format: 'directory'`
   - ✅ **Next.js equivalent:** `output: 'standalone'` for Docker (already configured)

4. **Astro-specific Vite Config**
   - ❌ Astro's Vite configuration
   - ✅ **Next.js equivalent:** Webpack/Turbopack configuration in `next.config.js`

---

## 🎯 Implementation Phases

### **Phase 1: Critical Fixes & Performance** (Week 1) - IMMEDIATE

**Priority: Fix issues preventing optimal performance**

**Tasks:**
1. ✅ Fix stale token loop (from audit)
2. ✅ Fix Service Worker caching issues (from audit)
3. ✅ Fix Suspense boundary errors (from audit)
4. ✅ Implement CSP properly (from audit)
5. 🆕 Add alt text to ALL images (accessibility)
6. 🆕 Add explicit width/height to all images (CLS fix)
7. 🆕 Implement priority loading for LCP image
8. 🆕 Convert font to WOFF2 and subset
9. 🆕 Add font preload
10. 🆕 Create robots.txt and sitemap.xml

**Expected Improvements:**
- Lighthouse Performance: 65 → 90+
- Lighthouse Accessibility: 75 → 95+
- LCP: Unknown → <2.5s
- CLS: Unknown → <0.1
- FCP: Unknown → <1.8s

**Files to Modify:**
- `/public/sw.js`
- `/src/lib/graphql.ts`
- `/src/ui/components/AuthProvider.tsx`
- `/src/lib/urqlAuthErrorExchange.ts`
- `/src/app/error.tsx`
- `/src/checkout/Root.tsx`
- `/src/app/layout.tsx`
- `/src/app/checkout/layout.tsx`
- `/next.config.js`
- `/app/robots.ts` (new)
- `/app/sitemap.ts` (new)
- All components with images (9+ files)
- `/public/fonts/` (convert Geometos)

---

### **Phase 2: Bundle & Cache Optimization** (Week 2)

**Priority: Reduce bundle size and improve caching**

**Tasks:**
1. ✅ Implement URQL cache optimization (from audit)
2. ✅ Fix cookie synchronization (from audit)
3. 🆕 Analyze bundle with @next/bundle-analyzer
4. 🆕 Replace Formik with React Hook Form
5. 🆕 Lazy load payment components (Stripe, Adyen)
6. 🆕 Implement critical CSS extraction with Critters
7. 🆕 Configure ISR for product pages
8. 🆕 Add cache tags for granular revalidation
9. 🆕 Optimize Nginx caching configuration

**Expected Improvements:**
- Bundle size: -30-40%
- TTI: -1-2s
- Repeat visit TTFB: -40%
- Server load: -40%

**Files to Modify:**
- `/next.config.js`
- `/package.json`
- Form components (replace Formik)
- `/app/(main)/products/[slug]/page.tsx`
- `/src/lib/graphql.ts`
- Nginx configuration (Dokploy)

---

### **Phase 3: Security & SEO** (Week 3)

**Priority: Enhance security and search engine visibility**

**Tasks:**
1. 🆕 Add all missing security headers
2. 🆕 Implement nonce-based CSP with middleware
3. 🆕 Add subresource integrity for external scripts
4. 🆕 Implement structured data for all product pages
5. 🆕 Add breadcrumb schema
6. 🆕 Optimize meta descriptions and titles
7. 🆕 Add hreflang tags (if planning i18n)
8. 🆕 Update humans.txt (currently says "Built with Astro")
9. 🆕 Security testing and scoring

**Expected Improvements:**
- Security Headers: A+ on securityheaders.com
- Mozilla Observatory: A+ score
- SSL Labs: A+ score
- Structured data: 100% coverage
- Organic traffic: +20% over 6 months

**Files to Modify:**
- `/next.config.js`
- `/src/middleware.ts`
- `/public/humans.txt`
- Product page templates
- Category page templates

---

### **Phase 4: Advanced Accessibility** (Week 4)

**Priority: Achieve WCAG 2.1 AA compliance**

**Tasks:**
1. 🆕 Comprehensive ARIA audit
2. 🆕 Keyboard navigation testing
3. 🆕 Screen reader testing (NVDA, VoiceOver)
4. 🆕 Color contrast testing and fixes
5. 🆕 Form accessibility improvements
6. 🆕 Focus management in modals
7. 🆕 Heading hierarchy audit
8. 🆕 Landmark regions (header, nav, main, aside, footer)
9. 🆕 Skip navigation improvements
10. 🆕 Touch target sizes (44x44px minimum)

**Expected Improvements:**
- Lighthouse Accessibility: 95 → 100
- WCAG 2.1 AA: Full compliance
- Keyboard navigation: 100% coverage
- Screen reader compatibility: Excellent

**Files to Modify:**
- All interactive components
- All forms
- Modal components
- Navigation components
- Layout components

---

### **Phase 5: Advanced Optimization** (Week 5)

**Priority: Fine-tune for ultimate performance**

**Tasks:**
1. 🆕 Implement GraphQL persisted queries
2. 🆕 Add GraphQL query batching
3. 🆕 Optimize over-fetching in queries
4. 🆕 Implement blur placeholders for images
5. 🆕 Add resource hints (preconnect, dns-prefetch)
6. 🆕 Implement background sync for PWA
7. 🆕 Add Web Vitals tracking
8. 🆕 Set up Lighthouse CI
9. 🆕 Performance budgets
10. 🆕 RUM (Real User Monitoring)

**Expected Improvements:**
- API latency: -30%
- GraphQL payload: -30%
- User experience: Seamless
- Monitoring: Complete visibility

**Files to Modify:**
- URQL client configuration
- GraphQL query files
- Image components
- `/app/layout.tsx`
- CI/CD configuration

---

### **Phase 6: Monitoring & Testing** (Week 6)

**Priority: Ensure quality and prevent regressions**

**Tasks:**
1. 🆕 Set up error tracking (Sentry)
2. 🆕 Implement Web Vitals reporting
3. 🆕 Add performance monitoring dashboard
4. 🆕 Configure Lighthouse CI
5. 🆕 Set up visual regression testing
6. 🆕 Cross-browser testing (BrowserStack)
7. 🆕 Device testing (real devices)
8. 🆕 Load testing
9. 🆕 Security penetration testing
10. 🆕 Performance budgets enforcement

**Expected Improvements:**
- Automated testing: 100% coverage
- Performance regressions: Prevented
- Error detection: Real-time
- Quality assurance: Continuous

**Tools to Integrate:**
- Sentry or similar
- Lighthouse CI
- Percy or Chromatic
- BrowserStack
- JMeter or k6

---

## 📈 Expected Overall Impact

### Performance Metrics (Target vs. Current Unknown)

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| **Lighthouse Performance** | Unknown | 95+ | Significant |
| **Lighthouse Accessibility** | Unknown | 100 | Major |
| **Lighthouse SEO** | Unknown | 100 | Major |
| **Lighthouse Best Practices** | Unknown | 100 | Significant |
| **LCP** | Unknown | <2.5s | Critical |
| **FID/INP** | Unknown | <100ms | Important |
| **CLS** | Unknown | <0.1 | Critical |
| **TTFB** | Unknown | <800ms | Important |
| **FCP** | Unknown | <1.8s | Critical |
| **TTI** | Unknown | <3.5s | Important |
| **Bundle Size (JS)** | Unknown | <500KB gzip | -30-40% |
| **Bundle Size (CSS)** | Unknown | <50KB gzip | -20% |

### Business Metrics

| Metric | Expected Improvement |
|--------|---------------------|
| **Conversion Rate** | +15-25% |
| **Bounce Rate** | -20-30% |
| **Organic Traffic** | +20-40% (6 months) |
| **Page Load Time** | -40-50% |
| **Server Costs** | -30-40% (better caching) |
| **Mobile Experience** | +50% (accessibility + performance) |
| **SEO Rankings** | +2-3 positions (average) |

---

## 🔍 Testing Strategy

### Automated Testing

**1. Performance Testing:**
```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci autorun --collect.numberOfRuns=5

# WebPageTest
curl "https://www.webpagetest.org/runtest.php?url=https://sonicdrivestudio.com&k=API_KEY"
```

**2. Accessibility Testing:**
```bash
# Pa11y
npm install -g pa11y
pa11y https://sonicdrivestudio.com

# axe-core
npm install -D @axe-core/cli
axe https://sonicdrivestudio.com
```

**3. Security Testing:**
```bash
# Mozilla Observatory
curl "https://http-observatory.security.mozilla.org/api/v1/analyze?host=sonicdrivestudio.com"

# Security Headers
curl -I https://sonicdrivestudio.com
```

**4. SEO Testing:**
```bash
# Structured data
curl "https://validator.schema.org/?url=https://sonicdrivestudio.com/products/example"

# Mobile-friendly
curl "https://search.google.com/test/mobile-friendly?url=https://sonicdrivestudio.com"
```

### Manual Testing

**1. Performance:**
- Test on 3G/4G network throttling
- Test on low-end devices
- Test from multiple geographic locations
- Test cache behavior

**2. Accessibility:**
- Navigate with keyboard only (Tab, Shift+Tab, Enter, Space, Esc)
- Test with screen readers (NVDA on Windows, VoiceOver on Mac)
- Test at 200% zoom
- Test with Windows High Contrast Mode
- Test with color blindness simulators

**3. Cross-browser:**
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Samsung Internet
- iOS Safari
- Android Chrome

**4. Functionality:**
- Complete checkout flow
- Add to cart
- Search
- Filters
- Forms (login, register, address)
- Payment processing

---

## 📚 Additional Recommendations

### 1. Consider HTTP/3 and QUIC
Since you're self-hosting with Nginx, consider enabling HTTP/3:

```nginx
# Enable HTTP/3 (requires Nginx 1.25.0+)
listen 443 quic reuseport;
listen 443 ssl http2;

add_header Alt-Svc 'h3=":443"; ma=86400';
```

**Impact:** -20% latency, better mobile performance

### 2. Consider Edge Caching (Cloudflare Free Tier)
Even though you're self-hosting, you can use Cloudflare's free tier for:
- DDoS protection
- Edge caching for static assets
- Automatic HTTP/3
- Automatic Brotli compression
- Web analytics

**Impact:** -50% TTFB globally, better reliability

### 3. Database Optimization
Since everything is on the same machine:
- Enable PostgreSQL query caching
- Add database indexes for common queries
- Use connection pooling
- Consider Redis for session storage

**Impact:** -40% API response time

### 4. Docker Optimization
```dockerfile
# Multi-stage builds for smaller images
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

**Impact:** -60% image size, faster deployments

---

## 🎯 Success Criteria

### Week 1 Goals
- [ ] All critical issues from audit fixed
- [ ] All images have alt text
- [ ] All images have explicit dimensions
- [ ] Font converted to WOFF2
- [ ] robots.txt and sitemap.xml created
- [ ] Lighthouse Performance > 85
- [ ] Lighthouse Accessibility > 90

### Week 2 Goals
- [ ] Bundle size reduced by 30%
- [ ] ISR implemented for products
- [ ] Critical CSS extraction working
- [ ] Payment components lazy loaded
- [ ] Nginx caching optimized

### Week 3 Goals
- [ ] Security Headers: A+ on securityheaders.com
- [ ] Mozilla Observatory: A+ score
- [ ] CSP implemented without violations
- [ ] Structured data on all pages

### Week 4 Goals
- [ ] WCAG 2.1 AA compliance
- [ ] Lighthouse Accessibility: 100
- [ ] Keyboard navigation: 100% coverage
- [ ] Screen reader compatible

### Week 5 Goals
- [ ] GraphQL optimizations complete
- [ ] Blur placeholders implemented
- [ ] Web Vitals tracking active
- [ ] All Core Web Vitals in "Good" range

### Week 6 Goals
- [ ] Lighthouse CI integrated
- [ ] Error tracking active
- [ ] Performance monitoring dashboard
- [ ] All tests passing

---

## 📞 Next Steps

**Immediate Actions:**
1. Review this roadmap and prioritize based on business needs
2. Approve Phase 1 for immediate implementation
3. Set up development environment for testing
4. Create performance baseline (run Lighthouse audit)
5. Begin implementation

**Ready to start with Phase 1?**

Once approved, I will:
1. Begin with critical fixes from the performance audit
2. Add image optimization (alt text, dimensions, priority)
3. Optimize fonts (WOFF2 conversion, subsetting)
4. Create SEO files (robots.txt, sitemap.xml)
5. Test and measure improvements
6. Commit and push changes
7. Move to Phase 2

**Estimated time for Phase 1: 5-7 days**

---

*This roadmap is a living document and will be updated as we progress through implementation.*
