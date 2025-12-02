# Storefront Performance Audit & Improvement Plan

**Date:** 2025-12-01
**Branch:** `claude/storefront-performance-audit-012gSiWNBsKHy2VhWYHqoWC7`

## Executive Summary

This document outlines critical performance, reliability, and state management issues discovered during a comprehensive audit of the Saleor storefront. Each issue has been analyzed with root cause identification and detailed solutions.

---

## 🔴 Critical Issues Identified

### 1. Service Worker Performance & Resiliency Issues

**Severity:** HIGH
**Impact:** Causes stale authentication states, failed requests, and requires browser restart to recover

#### Root Causes

1. **Aggressive Cache Interference**
   - SW intercepts all same-origin requests except CSS/JS
   - Network-first strategy for API routes still caches failed responses
   - No distinction between authenticated and unauthenticated requests
   - Cached 401/403 responses persist even after token refresh

2. **No Error Recovery Mechanism**
   - Failed fetches in `networkFirst()` strategy throw errors without recovery
   - No timeout handling for hung requests
   - No cache invalidation on authentication state changes

3. **Update Check Frequency**
   - Checks for SW updates every 60 seconds (line 14-16 in `sw-register.tsx`)
   - Excessive and unnecessary for typical usage patterns
   - Causes performance overhead

4. **Cache Version Management**
   - Static cache version `v3` doesn't auto-invalidate on deployment
   - Old service workers can serve stale code after deployments
   - No mechanism to force cache refresh on auth errors

#### Solutions

**A. Implement Selective Caching Strategy**
```javascript
// Exclude authentication-related endpoints from caching entirely
const NO_CACHE_PATTERNS = [
  /\/api\/auth\//,
  /\/graphql\/.*refreshToken/,
  /\/graphql\/.*tokenRefresh/,
  /checkout/
];

// Check before caching
if (NO_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
  // Never cache auth-related or checkout requests
  return fetch(request);
}
```

**B. Add Response Validation**
```javascript
// Don't cache error responses
if (response.ok && response.status < 400) {
  cache.put(request, response.clone());
}
```

**C. Implement Cache Invalidation on Auth Changes**
```javascript
// Listen for auth state changes and clear relevant caches
self.addEventListener('message', (event) => {
  if (event.data.type === 'AUTH_STATE_CHANGED') {
    clearAuthRelatedCaches();
  }
});
```

**D. Add Request Timeouts**
```javascript
async function fetchWithTimeout(request, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**E. Reduce Update Check Frequency**
```javascript
// Change from 60s to 5 minutes
setInterval(() => {
  void registration.update();
}, 300000); // 5 minutes
```

**F. Build-Time Cache Versioning**
```javascript
// Use build ID for cache versioning
const CACHE_VERSION = process.env.BUILD_ID || 'v3';
```

---

### 2. Stale Token & Checkout Request Loop

**Severity:** CRITICAL
**Impact:** Checkout becomes completely unusable until browser restart (reload doesn't fix)

#### Root Causes

1. **Multiple Cookie Management Systems Conflict**
   - Server-side: Next.js cookies API (`getNextServerCookiesStorageAsync()`)
   - Client-side: Custom `browserCookieStorage` in AuthProvider
   - Both systems don't sync properly when tokens expire

2. **Unstable Cache Persists Failed Auth States**
   - `unstable_cache` in `graphql.ts` (line 159-165) caches the result with the cache key including the operation and variables
   - When auth fails, the cached response includes the error
   - Subsequent requests use the cached failed response
   - **The cache key doesn't include auth state**, so stale cached responses persist across token refreshes

3. **Circular Redirect Logic**
   - Token expires → GraphQL error → Redirect to `/api/auth/clear-session`
   - Clear session route clears cookies → Redirects to `/`
   - Page reloads → SW serves cached failed response → Loop continues

4. **Service Worker Serves Cached Failed Responses**
   - Even after cookies are cleared, SW has cached the failed GraphQL response
   - `networkFirst` strategy falls back to cache on network failure
   - The cached error response is served repeatedly

5. **URQL Cache Persists Failed Queries**
   - URQL's `cacheExchange` caches failed queries
   - When tokens expire, failed queries stay in URQL cache
   - Even after token refresh, URQL serves cached errors
   - `requestPolicy: "cache-first"` in checkout (line 29 in `Root.tsx`) makes it worse

#### Why Closing/Reopening Fixes It

- Closes the browser tab/window completely
- Service Worker is terminated (not just refreshed)
- URQL cache is destroyed
- All in-memory state is cleared
- Fresh page load creates new SW, new URQL client, fresh cookies

#### Why Reload Doesn't Fix It

- Service Worker remains active across page reloads
- URQL cache persists in client-side memory during soft navigation
- `unstable_cache` on server still has cached responses
- Cookies might be cleared but cached responses remain

#### Solutions

**A. Disable Caching for Authenticated Requests**
```typescript
// In graphql.ts
const shouldUseCache = revalidate !== undefined &&
                      cache !== "no-cache" &&
                      !withAuth; // ✅ Already doing this, but verify it works

// Add explicit no-cache for auth operations
if (operation.toString().includes('tokenRefresh') ||
    operation.toString().includes('checkout')) {
  cache = 'no-cache';
}
```

**B. Clear URQL Cache on Auth Errors**
```typescript
// In urqlAuthErrorExchange.ts
if (isSignatureExpired) {
  console.warn("[AUTH] JWT signature expired, clearing URQL cache...");

  // Clear URQL cache completely
  if (typeof window !== 'undefined') {
    // Force URQL to clear its cache
    window.location.href = "/";
  }
}
```

**C. Invalidate SW Cache on Auth Errors**
```typescript
// In urqlAuthErrorExchange.ts and error.tsx
if (isSignatureExpired) {
  // Send message to SW to clear all caches
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_ALL_CACHES'
    });
  }

  // Small delay to let SW clear caches
  await new Promise(resolve => setTimeout(resolve, 100));
  window.location.href = "/";
}
```

**D. Add SW Cache Clearing Handler**
```javascript
// In sw.js
self.addEventListener('message', (event) => {
  if (event.data.type === 'CLEAR_ALL_CACHES') {
    event.waitUntil(clearAllCaches());
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(name => caches.delete(name))
  );
  console.log('[SW] All caches cleared');
}
```

**E. Change URQL Request Policy**
```typescript
// In Root.tsx (checkout)
const makeUrqlClient = () =>
  createClient({
    url: saleorApiUrl,
    suspense: true,
    requestPolicy: "network-only", // ⚠️ Change from "cache-first"
    // ... rest
  });
```

**F. Add Cache Busting to GraphQL Requests After Auth Errors**
```typescript
// In graphql.ts
const fetchData = async () => {
  // ... existing code ...

  const input = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Add timestamp to bust caches after auth errors
      "X-Request-Time": Date.now().toString(),
      ...headers,
    },
    // ... rest
  };
};
```

**G. Prevent unstable_cache from Caching Errors**
```typescript
// In graphql.ts
const fetchData = async () => {
  // ... existing fetch logic ...

  if ("errors" in body) {
    // Don't cache error responses
    // Throw immediately without caching
    throw new GraphQLError(body);
  }

  return body.data;
};

// Wrap unstable_cache with error handling
if (shouldUseCache) {
  try {
    const cacheKey = [operation.toString(), JSON.stringify(variables)];
    const cachedFetch = unstable_cache(fetchData, cacheKey, {
      revalidate,
      tags: tags || [],
    });
    return cachedFetch();
  } catch (error) {
    // On error, bypass cache and fetch directly
    return fetchData();
  }
}
```

---

### 3. Content Security Policy (CSP) Violations

**Severity:** MEDIUM
**Impact:** Browser warnings, potential security vulnerabilities, future blocking when CSP is enforced

#### Root Causes

1. **Proxy/CDN Injects Report-Only CSP**
   - CSP is disabled in `next.config.js` (lines 78-96, commented out)
   - Log shows: `script-src 'none'` in report-only mode
   - This means a proxy/CDN (likely Cloudflare or similar) is injecting overly restrictive CSP headers

2. **Overly Restrictive Policy**
   - `script-src 'none'` blocks ALL scripts (way too restrictive)
   - Next.js requires `'self'`, `'unsafe-inline'`, and `'unsafe-eval'` for proper operation
   - Inline scripts need hash or nonce for React hydration

3. **Missing Nonce Implementation**
   - Next.js 13+ supports nonces for CSP
   - Current implementation doesn't use nonces
   - All inline scripts are blocked by strict CSP

#### Solutions

**A. Re-enable CSP in Next.js Config (Take Control)**
```javascript
// In next.config.js, uncomment and update CSP
{
  key: "Content-Security-Policy",
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com https://saleor-api.sonicdrivestudio.com https://*.saleor.cloud wss://*.saleor.cloud",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; "),
}
```

**B. Implement Nonce-Based CSP (Recommended)**
```typescript
// Create middleware to generate nonces
// In middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: http:`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com https://saleor-api.sonicdrivestudio.com",
    "worker-src 'self' blob:",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}
```

**C. Configure Proxy/CDN to Remove Conflicting CSP**
- If using Cloudflare: Disable automatic CSP injection
- Use Cloudflare Page Rules to remove conflicting headers
- Let Next.js handle CSP entirely

**D. Progressive Enhancement Approach**
1. Start with report-only mode to identify violations
2. Collect reports and fix violations
3. Switch to enforcing mode
4. Monitor and iterate

---

### 4. Next.js Suspense Boundary Errors (React #419)

**Severity:** HIGH
**Impact:** Server rendering fails, falls back to client rendering, causing layout shifts and performance degradation

#### Root Causes

1. **AuthProvider Suspended During SSR**
   - `AuthProvider` is wrapped in Suspense in `checkout/layout.tsx` (line 12-20)
   - AuthProvider creates URQL client with `suspense: true` (line 66 in `AuthProvider.tsx`)
   - During SSR, if auth check suspends and fails, the Suspense boundary breaks

2. **URQL Suspense Mode on Server**
   - URQL with `suspense: true` throws promises during data fetching
   - If server-side auth fails (expired token), the promise rejects
   - React can't handle rejected Suspense promises on server
   - Falls back to client rendering (React error #419)

3. **Server-Side Cookie Access Timing**
   - `getNextServerCookiesStorageAsync()` is async
   - During React SSR, async cookie access might not resolve in time
   - Causes Suspense boundary to timeout and fail

4. **Missing Error Boundaries Around Suspense**
   - Suspense boundaries don't have error boundaries wrapping them
   - When auth fails during SSR, errors propagate up
   - No graceful degradation path

5. **Root Layout Suspense Without Fallback**
   - Line 157-159 in `layout.tsx`: `<Suspense>` without fallback
   - If DraftModeNotification suspends and fails, no fallback to show

#### Solutions

**A. Disable Suspense for Server Components**
```typescript
// In AuthProvider.tsx
const makeUrqlClient = () => {
  return createClient({
    url: saleorApiUrl,
    suspense: typeof window !== 'undefined', // ✅ Only enable on client
    fetch: (input, init) => saleorAuthClient.fetchWithAuth(input, init),
    exchanges: [dedupExchange, cacheExchange, authErrorExchange, fetchExchange],
  });
};
```

**B. Wrap AuthProvider in Error Boundary**
```typescript
// In checkout/layout.tsx
import { ErrorBoundary } from 'react-error-boundary';

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <main>
      <ErrorBoundary
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <p>Loading checkout...</p>
          </div>
        }
      >
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-500 border-t-transparent" />
            </div>
          }
        >
          <AuthProvider>{props.children}</AuthProvider>
        </Suspense>
      </ErrorBoundary>
    </main>
  );
}
```

**C. Add Explicit Fallbacks to All Suspense Boundaries**
```typescript
// In app/layout.tsx
<Suspense fallback={null}> {/* ✅ Add explicit fallback */}
  <DraftModeNotification />
</Suspense>
```

**D. Use Dynamic Import for Client-Only Components**
```typescript
// For components that shouldn't SSR
import dynamic from 'next/dynamic';

const AuthProvider = dynamic(
  () => import('@/ui/components/AuthProvider').then(mod => ({ default: mod.AuthProvider })),
  { ssr: false }
);
```

**E. Implement Proper SSR Error Handling in URQL**
```typescript
// Create a server-safe URQL client
const makeServerSafeUrqlClient = () => {
  const isServer = typeof window === 'undefined';

  return createClient({
    url: saleorApiUrl,
    suspense: !isServer, // Disable suspense on server
    requestPolicy: isServer ? 'network-only' : 'cache-first',
    fetch: async (input, init) => {
      try {
        return await saleorAuthClient.fetchWithAuth(input, init);
      } catch (error) {
        // On server, handle auth errors gracefully
        if (isServer) {
          console.warn('[URQL SSR] Auth error during SSR, using unauthenticated request');
          return fetch(input, init);
        }
        throw error;
      }
    },
    exchanges: [dedupExchange, cacheExchange, authErrorExchange, fetchExchange],
  });
};
```

---

## 🟡 State Management Optimizations

### 5. URQL Cache Configuration

**Issue:** Aggressive caching causes stale data and failed queries to persist

#### Improvements

**A. Optimize Cache Exchange**
```typescript
import { cacheExchange } from '@urql/exchange-graphcache';

const cache = cacheExchange({
  keys: {
    Money: () => null,
    TaxedMoney: () => null,
    // ... other types that shouldn't be cached
  },
  updates: {
    Mutation: {
      tokenRefresh: (result, args, cache, info) => {
        // Invalidate all queries on token refresh
        cache.invalidate('Query');
      },
      checkoutComplete: (result, args, cache, info) => {
        // Clear checkout from cache
        cache.invalidate({ __typename: 'Checkout', id: args.id });
      },
    },
  },
  optimistic: {
    // Add optimistic updates for better UX
  },
});
```

**B. Implement Cache Invalidation Strategy**
```typescript
// Add tags to cache for selective invalidation
const urqlClient = createClient({
  url: saleorApiUrl,
  suspense: true,
  exchanges: [
    dedupExchange,
    cache,
    authErrorExchange,
    // Add invalidation exchange
    invalidationExchange,
    fetchExchange,
  ],
});
```

---

### 6. Cookie Synchronization

**Issue:** Client and server cookie management systems are out of sync

#### Improvements

**A. Unified Cookie Management**
```typescript
// Create shared cookie utilities
export const cookieManager = {
  get(name: string): string | null {
    if (typeof window === 'undefined') {
      // Server-side: use Next.js cookies
      return cookies().get(name)?.value ?? null;
    } else {
      // Client-side: use document.cookie
      // ... existing browserCookieStorage logic
    }
  },

  set(name: string, value: string, options?: CookieOptions): void {
    // Unified set logic
  },

  remove(name: string): void {
    // Unified remove logic
  },
};
```

**B. Implement Cookie Change Events**
```typescript
// Broadcast cookie changes across tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'auth-state-changed') {
      // Refresh auth state
      saleorAuthClient.resetAuth();
    }
  });
}
```

---

## 🟢 Performance Optimizations

### 7. Service Worker Optimization

**A. Implement Proper Precaching**
```javascript
// Cache critical assets during install
const CRITICAL_ASSETS = [
  '/',
  '/site.webmanifest',
  // Add critical fonts, icons, etc.
];

// Don't block on non-critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CRITICAL_ASSETS))
      .catch(err => console.warn('Non-blocking cache error:', err))
  );
  self.skipWaiting(); // ✅ Good
});
```

**B. Add Cache Size Limits**
```javascript
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    // Delete oldest items (FIFO)
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxItems);
  }
}

// Call after adding to cache
await limitCacheSize(CACHE_NAME, 100);
```

**C. Implement Background Sync for Failed Requests**
```javascript
// Queue failed mutations for retry
self.addEventListener('sync', (event) => {
  if (event.tag === 'retry-failed-requests') {
    event.waitUntil(retryFailedRequests());
  }
});
```

---

### 8. GraphQL Query Optimization

**A. Add Query Batching**
```typescript
// Install @urql/exchange-graphcache
import { batchExchange } from '@urql/exchange-batch';

const urqlClient = createClient({
  url: saleorApiUrl,
  exchanges: [
    dedupExchange,
    cacheExchange,
    batchExchange, // ✅ Batch queries
    authErrorExchange,
    fetchExchange,
  ],
});
```

**B. Implement Persisted Queries**
```typescript
// Use persisted queries to reduce payload size
import { persistedExchange } from '@urql/exchange-persisted';

const urqlClient = createClient({
  exchanges: [
    dedupExchange,
    cacheExchange,
    persistedExchange({
      // ...config
    }),
    fetchExchange,
  ],
});
```

**C. Add Request Deduplication Window**
```typescript
// Increase dedup window for slower connections
import { dedupExchange } from '@urql/core';

const customDedupExchange = dedupExchange({
  // Default is 5s, increase to 10s
  ttl: 10000,
});
```

---

### 9. Image Loading Optimization

**A. Implement Progressive Image Loading**
```typescript
// Use blur placeholder for images
<Image
  src={imageUrl}
  alt={alt}
  placeholder="blur"
  blurDataURL={generateBlurDataURL(imageUrl)}
  priority={isAboveFold}
  loading={isAboveFold ? 'eager' : 'lazy'}
/>
```

**B. Optimize Image Prefetching**
```typescript
// Improve /api/prefetch-images/route.ts
// Add priority levels, limit concurrent prefetches
const HIGH_PRIORITY_ROUTES = ['/products/', '/categories/'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get('pathname');

  const isHighPriority = HIGH_PRIORITY_ROUTES.some(route =>
    pathname?.startsWith(route)
  );

  // Fetch with appropriate priority
  const images = await fetchImages(pathname, {
    limit: isHighPriority ? 10 : 5,
    quality: isHighPriority ? 85 : 75,
  });

  return Response.json({ images });
}
```

---

### 10. Bundle Size Optimization

**A. Analyze Bundle Composition**
```bash
npm run build -- --profile
npx @next/bundle-analyzer
```

**B. Lazy Load Heavy Components**
```typescript
// Lazy load checkout components
const CheckoutForm = dynamic(() => import('./CheckoutForm'), {
  loading: () => <CheckoutSkeleton />,
  ssr: false,
});

const PaymentForm = dynamic(() => import('./PaymentForm'), {
  loading: () => <Spinner />,
});
```

**C. Optimize Dependencies**
```json
// Replace heavy dependencies
{
  "formik": "remove", // Use react-hook-form instead (smaller)
  "lodash-es": "keep but tree-shake properly",
  "moment": "replace with date-fns or dayjs"
}
```

---

## 📊 Monitoring & Observability

### 11. Add Performance Monitoring

**A. Implement Web Vitals Tracking**
```typescript
// In app/layout.tsx or _app.tsx
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  console.log(metric);
}

if (typeof window !== 'undefined') {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
```

**B. Add Error Tracking**
```typescript
// Implement error boundary with reporting
class ErrorBoundaryWithReporting extends ErrorBoundary {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Send to error tracking service (Sentry, etc.)
    console.error('Error caught:', error, errorInfo);
    super.componentDidCatch(error, errorInfo);
  }
}
```

**C. Add Request Performance Logging**
```typescript
// In graphql.ts
const startTime = performance.now();
const response = await fetch(apiUrl, input);
const endTime = performance.now();

console.log(`[GraphQL] ${operation.toString().split('{')[0].trim()} took ${endTime - startTime}ms`);
```

---

## 🔄 Implementation Priority

### Phase 1: Critical Fixes (Immediate)
1. ✅ Fix stale token loop (Issue #2)
2. ✅ Implement SW cache invalidation on auth errors
3. ✅ Disable URQL suspense on server (Issue #4)
4. ✅ Add error boundaries around all Suspense boundaries

### Phase 2: High Priority (Week 1)
1. ✅ Optimize Service Worker caching strategy (Issue #1)
2. ✅ Implement CSP properly (Issue #3)
3. ✅ Unified cookie management (Issue #6)
4. ✅ URQL cache optimization (Issue #5)

### Phase 3: Performance Optimizations (Week 2)
1. ✅ Bundle size optimization (Issue #10)
2. ✅ Image loading optimization (Issue #9)
3. ✅ GraphQL query batching (Issue #8)
4. ✅ SW performance improvements (Issue #7)

### Phase 4: Monitoring & Polish (Week 3)
1. ✅ Web Vitals tracking (Issue #11)
2. ✅ Error tracking integration
3. ✅ Performance monitoring dashboard
4. ✅ Load testing and optimization

---

## 📝 Testing Strategy

### Unit Tests
- Cookie management utilities
- Cache invalidation logic
- Error boundary fallbacks

### Integration Tests
- Auth flow with token expiration
- Checkout flow with network failures
- SW cache invalidation

### E2E Tests
- Full checkout flow
- Token refresh during checkout
- Service Worker updates
- Multi-tab synchronization

### Performance Tests
- Lighthouse CI on every PR
- Bundle size monitoring
- Web Vitals thresholds

---

## 🎯 Success Metrics

### Reliability
- ✅ Zero checkout failures due to stale tokens
- ✅ 99.9% successful token refresh rate
- ✅ No React #419 errors in production

### Performance
- ✅ LCP < 2.5s (currently unknown)
- ✅ FID < 100ms
- ✅ CLS < 0.1
- ✅ TTI < 3.5s

### Bundle Size
- ✅ Main bundle < 200KB (gzipped)
- ✅ Total JS < 500KB (gzipped)
- ✅ Reduce by 30% from current

---

## 📚 Additional Recommendations

### 1. Consider Removing Service Worker
If the SW continues to cause issues, consider:
- Relying on browser cache and HTTP caching headers
- Using Next.js built-in caching mechanisms
- Implementing service worker only for offline support (not caching)

### 2. Migrate to React Query
URQL with Suspense mode is causing issues. Consider:
- Migrating to TanStack Query (React Query)
- Better SSR support
- More mature caching strategy
- Better DevTools

### 3. Implement Request Retry Logic
Add exponential backoff retry for failed requests:
```typescript
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
    }
  }
}
```

### 4. Add Health Check Endpoint
Create `/api/health` endpoint to verify:
- API connectivity
- Auth service status
- Cache status

---

## 🔗 Related Files

### Critical Files to Modify
- `/public/sw.js` - Service Worker
- `/src/app/sw-register.tsx` - SW registration
- `/src/lib/graphql.ts` - GraphQL client
- `/src/ui/components/AuthProvider.tsx` - Auth provider
- `/src/lib/urqlAuthErrorExchange.ts` - Auth error handling
- `/src/app/error.tsx` - Error boundary
- `/src/checkout/Root.tsx` - Checkout URQL client
- `/src/app/layout.tsx` - Root layout with Suspense
- `/src/app/checkout/layout.tsx` - Checkout layout
- `/next.config.js` - CSP and headers

### Supporting Files
- `/src/app/config.ts` - Auth client config
- `/src/app/api/auth/clear-session/route.ts` - Clear session route
- `/src/middleware.ts` - Cache-Control middleware
- `/src/app/actions.ts` - Server actions

---

## 📅 Next Steps

Once you approve this plan, I will:

1. Wait for your list of additional aspects to strengthen
2. Integrate your requirements into this plan
3. Begin implementation in priority order
4. Create commits after each major fix
5. Test each change thoroughly before moving to the next

**Ready to proceed with implementation?**
