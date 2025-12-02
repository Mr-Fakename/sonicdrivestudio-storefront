# Deployment Checklist

**Project:** Saleor Storefront Performance Optimization
**Branch:** `claude/storefront-performance-audit-012gSiWNBsKHy2VhWYHqoWC7`
**Date:** 2025-12-01

---

## Pre-Deployment Verification

### Code Quality
- [ ] Run `pnpm run type-check` - TypeScript compilation succeeds
- [ ] Run `pnpm run lint:check` - No ESLint errors
- [ ] Run `pnpm run build` - Build completes successfully
- [ ] Check bundle sizes with `pnpm run bundle:size`
- [ ] Review git diff for unintended changes

### Functionality Testing
- [ ] Test homepage loads correctly
- [ ] Test product listing page
- [ ] Test individual product pages
- [ ] Test cart functionality
- [ ] Test checkout flow (without completing payment)
- [ ] Test user authentication flow
- [ ] Verify Service Worker registers correctly
- [ ] Check browser console for errors

### Performance Verification
- [ ] Bundle size reduced by ~350KB
- [ ] Lazy loading chunks created for Stripe/Adyen
- [ ] Font file changed from TTF to WOFF2 (16KB)
- [ ] Image alt text present on all product images
- [ ] robots.txt accessible at `/robots.txt`
- [ ] sitemap.xml accessible at `/sitemap.xml`

---

## Staging Deployment

### Pre-Deployment
- [ ] Create backup of current production
- [ ] Document current performance metrics
  - [ ] Lighthouse scores
  - [ ] Core Web Vitals
  - [ ] Bundle sizes
  - [ ] Server response times
- [ ] Prepare rollback plan

### Deployment Steps
```bash
# 1. Ensure you're on the correct branch
git checkout claude/storefront-performance-audit-012gSiWNBsKHy2VhWYHqoWC7
git pull origin claude/storefront-performance-audit-012gSiWNBsKHy2VhWYHqoWC7

# 2. Install dependencies
pnpm install

# 3. Run code generation
pnpm run generate

# 4. Build for production
pnpm run build

# 5. Verify build output
ls -lh .next/static/chunks/

# 6. Start production server (or deploy to staging)
pnpm run start
```

### Post-Deployment Verification
- [ ] Homepage loads without errors
- [ ] No payment SDK loaded on homepage
- [ ] Navigate to checkout - payment SDKs load on demand
- [ ] Loading spinner appears briefly
- [ ] Payment form renders correctly
- [ ] Can complete test checkout
- [ ] Service Worker updates correctly
- [ ] No console errors
- [ ] No 404s in Network tab

### Performance Testing
```bash
# Run Lighthouse audit
pnpm run perf:lighthouse

# Expected results:
# - Performance: 90+ (up from 75-80)
# - Accessibility: 95+ (up from ~75)
# - Best Practices: 100
# - SEO: 100
```

- [ ] Lighthouse Performance ≥90
- [ ] Lighthouse Accessibility ≥95
- [ ] LCP <2.5s
- [ ] FID <100ms
- [ ] CLS <0.1
- [ ] FCP <1.8s
- [ ] TTFB <600ms

### Mobile Testing
- [ ] Test on Chrome mobile (DevTools simulation)
- [ ] Test on Fast 3G throttling
- [ ] Verify lazy loading works
- [ ] Check touch interactions
- [ ] Verify responsive images load correctly

---

## Nginx Configuration (Server-Side)

### Prerequisites
- [ ] Review `NGINX_CACHING_RECOMMENDATIONS.md`
- [ ] Backup current nginx configuration
- [ ] Test configuration in staging first

### Implementation Steps
```bash
# 1. Backup current config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
sudo cp /etc/nginx/sites-available/storefront /etc/nginx/sites-available/storefront.backup

# 2. Create cache directories
sudo mkdir -p /var/cache/nginx/static
sudo mkdir -p /var/cache/nginx/nextjs
sudo mkdir -p /var/cache/nginx/api
sudo chown -R www-data:www-data /var/cache/nginx/

# 3. Apply new configuration
# (Copy relevant sections from NGINX_CACHING_RECOMMENDATIONS.md)

# 4. Test configuration
sudo nginx -t

# 5. Reload nginx
sudo nginx -s reload

# 6. Verify caching
curl -I https://yourdomain.com/_next/static/chunks/[hash].js
# Look for: X-Cache-Status: MISS (first request), then HIT (subsequent)
```

### Post-Configuration Verification
- [ ] Static assets return `X-Cache-Status: HIT`
- [ ] Cache-Control headers correct
- [ ] Compression enabled (Content-Encoding: br or gzip)
- [ ] No caching on `/api/auth`, `/checkout`, `/account`
- [ ] Rate limiting working
- [ ] Monitor cache hit ratio:
  ```bash
  tail -f /var/log/nginx/access.log | grep -o 'cache:[A-Z]*' | sort | uniq -c
  ```

### Expected Results
- [ ] Cache hit ratio >70%
- [ ] Server load reduced by 60-80%
- [ ] TTFB for cached content <50ms
- [ ] Bandwidth usage reduced by 40-60%

---

## Production Deployment

### Pre-Production Checks
- [ ] Staging tests passed for 48+ hours
- [ ] No critical issues found
- [ ] Performance metrics improved
- [ ] Stakeholder approval obtained
- [ ] Rollback plan documented

### Gradual Rollout (Recommended)

#### Phase 1: 10% Traffic (Day 1)
```bash
# If using feature flags or traffic splitting
ROLLOUT_PERCENTAGE=10 pnpm run deploy:production
```

- [ ] Deploy to 10% of users
- [ ] Monitor error rates (should not increase)
- [ ] Monitor conversion rates (should not decrease)
- [ ] Check Core Web Vitals in RUM data
- [ ] Watch for support tickets

#### Phase 2: 50% Traffic (Day 2-3)
- [ ] No issues in Phase 1
- [ ] Increase to 50% of users
- [ ] Continue monitoring
- [ ] Check bundle delivery metrics

#### Phase 3: 100% Traffic (Day 4-5)
- [ ] No issues in Phase 2
- [ ] Deploy to 100% of users
- [ ] Monitor closely for first 24 hours

### Full Deployment (Alternative)
```bash
# Full deployment (if not using gradual rollout)
git checkout claude/storefront-performance-audit-012gSiWNBsKHy2VhWYHqoWC7
pnpm install
pnpm run build
# Deploy to production
```

---

## Post-Deployment Monitoring

### Day 1
- [ ] Monitor error rates every 2 hours
- [ ] Check conversion rates
- [ ] Review user feedback/support tickets
- [ ] Monitor server metrics (CPU, memory, disk)
- [ ] Check cache hit ratios

### Day 2-7
- [ ] Daily error rate review
- [ ] Daily performance metrics review
- [ ] Weekly Lighthouse audits
- [ ] Compare metrics to pre-deployment baseline

### Metrics to Track

**Performance:**
- [ ] Lighthouse scores (daily)
- [ ] Core Web Vitals (Google Search Console)
- [ ] Bundle size (each deployment)
- [ ] Page load times (RUM data)
- [ ] Server response times

**Business:**
- [ ] Conversion rate
- [ ] Bounce rate
- [ ] Cart abandonment rate
- [ ] Average session duration
- [ ] Pages per session

**Technical:**
- [ ] Error rates (Sentry, LogRocket, etc.)
- [ ] Server load (CPU, memory)
- [ ] Cache hit ratio (nginx logs)
- [ ] Bandwidth usage
- [ ] CDN costs (if applicable)

---

## Rollback Procedures

### Quick Rollback (If Issues Occur)
```bash
# Option 1: Git revert
git revert 31d5b90  # Revert summary
git revert 4e38795  # Revert verification guide
git revert b77a192  # Revert Phase 2
git revert 09f67a4..7bbce43  # Revert Phase 1 manual
git revert a47467f..5427715  # Revert Phase 1
git push
# Deploy reverted version

# Option 2: Checkout previous version
git checkout <previous-commit-hash>
pnpm install
pnpm run build
# Deploy
```

### Nginx Rollback
```bash
# Restore backup configuration
sudo cp /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf
sudo cp /etc/nginx/sites-available/storefront.backup /etc/nginx/sites-available/storefront
sudo nginx -t
sudo nginx -s reload
```

---

## Troubleshooting

### Issue: Payment components don't load
**Symptoms:** Loading spinner stuck, no payment form

**Solutions:**
1. Check browser console for errors
2. Verify network requests for SDK chunks
3. Check CSP headers aren't blocking SDKs
4. Verify lazy component imports are correct

### Issue: High server load after deployment
**Symptoms:** Server CPU/memory high

**Solutions:**
1. Check nginx cache hit ratio (should be >70%)
2. Verify cache zones are working
3. Check for cache stampede (many requests to same resource)
4. Review nginx error logs

### Issue: Images not loading
**Symptoms:** Broken image icons

**Solutions:**
1. Check alt text fallbacks aren't breaking anything
2. Verify image paths correct
3. Check Next.js Image component props
4. Review Network tab for 404s

### Issue: Service Worker errors
**Symptoms:** SW registration fails, cache errors

**Solutions:**
1. Check SW scope is correct
2. Verify NO_CACHE_PATTERNS work correctly
3. Clear browser cache and reload
4. Check SW update mechanism

---

## Success Criteria

### Performance (All must pass)
- [x] Bundle size reduced by ≥300KB
- [ ] Lighthouse Performance score ≥90
- [ ] Lighthouse Accessibility score ≥95
- [ ] LCP <2.5s (75th percentile)
- [ ] FID <100ms (75th percentile)
- [ ] CLS <0.1 (75th percentile)

### Reliability (All must pass)
- [ ] Error rate unchanged or decreased
- [ ] No increase in support tickets
- [ ] Checkout completion rate unchanged or increased
- [ ] No browser compatibility issues

### Business (No negative impact)
- [ ] Conversion rate unchanged or increased
- [ ] Bounce rate unchanged or decreased
- [ ] Cart abandonment unchanged or decreased

---

## Communication Plan

### Before Deployment
- [ ] Notify team of deployment window
- [ ] Inform support team of changes
- [ ] Prepare monitoring dashboards
- [ ] Set up alerting for critical metrics

### During Deployment
- [ ] Real-time monitoring in shared channel
- [ ] Status updates every hour
- [ ] Quick decision making process ready

### After Deployment
- [ ] Send deployment summary email
- [ ] Share performance improvement metrics
- [ ] Document any issues encountered
- [ ] Schedule retrospective meeting

---

## Documentation Updates

### Post-Deployment
- [ ] Update README with new scripts
- [ ] Document nginx configuration in repo
- [ ] Update deployment documentation
- [ ] Archive optimization documentation for reference
- [ ] Create performance baseline document

---

## Phase 3 Planning (Optional)

If all goes well and you want to continue optimizing:

### Quick Wins (1-2 days)
- [ ] Add bundle analyzer to CI/CD
- [ ] Implement Service Worker precaching
- [ ] Add performance budgets

### Medium Effort (1 week)
- [ ] Replace Formik with react-hook-form
- [ ] Consolidate validation libraries (Zod only)
- [ ] Replace lodash-es with native methods

### Long Term (2-4 weeks)
- [ ] Implement HTTP/3 (if nginx supports)
- [ ] Add RUM (Real User Monitoring)
- [ ] Set up automated performance testing in CI/CD

---

## Sign-off

**Deployment Date:** ______________
**Deployed By:** ______________
**Reviewed By:** ______________
**Rollback Decision Maker:** ______________

**Deployment Status:**
- [ ] Successful - No issues
- [ ] Successful - Minor issues (documented below)
- [ ] Rolled back - Issues encountered (documented below)

**Notes:**
```
[Add any notes here about the deployment]
```

---

**End of Deployment Checklist**
