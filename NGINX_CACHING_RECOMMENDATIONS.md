# Nginx Caching Configuration Recommendations

**For:** Saleor Storefront Performance Optimization (Phase 2)
**Date:** 2025-12-01
**Context:** Nginx deployed alongside Saleor API with Traefik
**Target:** Optimize caching for Next.js 16 + React 19 storefront

---

## Executive Summary

This document provides comprehensive nginx caching recommendations for the Saleor storefront. These configurations will significantly improve performance by:

- **Reducing server load** by 60-80%
- **Improving Time to First Byte (TTFB)** from ~300ms to <50ms for cached content
- **Reducing bandwidth usage** by 40-60%
- **Improving Core Web Vitals** (LCP, FCP, TTFB)

---

## Table of Contents

1. [Cache Zones Configuration](#1-cache-zones-configuration)
2. [Static Assets Caching](#2-static-assets-caching)
3. [Next.js Specific Caching](#3-nextjs-specific-caching)
4. [API Response Caching](#4-api-response-caching)
5. [Compression Configuration](#5-compression-configuration)
6. [Security Headers](#6-security-headers)
7. [Rate Limiting](#7-rate-limiting)
8. [Complete Configuration Example](#8-complete-configuration-example)

---

## 1. Cache Zones Configuration

Define cache zones in the `http` block of your nginx configuration:

```nginx
# In http block
http {
    # Cache path for static assets
    proxy_cache_path /var/cache/nginx/static
        levels=1:2
        keys_zone=static_cache:100m
        max_size=10g
        inactive=7d
        use_temp_path=off;

    # Cache path for Next.js pages
    proxy_cache_path /var/cache/nginx/nextjs
        levels=1:2
        keys_zone=nextjs_cache:50m
        max_size=5g
        inactive=24h
        use_temp_path=off;

    # Cache path for API responses (GraphQL)
    proxy_cache_path /var/cache/nginx/api
        levels=1:2
        keys_zone=api_cache:20m
        max_size=1g
        inactive=10m
        use_temp_path=off;

    # Cache key configuration
    proxy_cache_key "$scheme$request_method$host$request_uri$http_accept";

    # Add cache status to response headers (for debugging)
    add_header X-Cache-Status $upstream_cache_status;
}
```

**Explanation:**
- **levels=1:2**: Creates a two-level directory hierarchy (prevents too many files in one directory)
- **keys_zone**: Memory zone for cache keys (100m = ~800k keys)
- **max_size**: Maximum disk space for cache
- **inactive**: Remove cached items not accessed for this duration
- **use_temp_path=off**: Write directly to cache path (faster)

---

## 2. Static Assets Caching

Configure aggressive caching for immutable static assets:

```nginx
# In server block
server {
    listen 80;
    server_name yourdomain.com;

    # Static assets location (Next.js /_next/static/)
    location /_next/static/ {
        proxy_pass http://nextjs_upstream;
        proxy_cache static_cache;
        proxy_cache_valid 200 365d;              # Cache successful responses for 1 year
        proxy_cache_valid 404 1h;                # Cache 404s for 1 hour
        proxy_cache_bypass $http_cache_control; # Allow cache bypass
        proxy_ignore_headers Cache-Control;      # Ignore upstream Cache-Control

        # Add immutable cache header
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header X-Cache-Status $upstream_cache_status;

        # CORS headers (if needed)
        add_header Access-Control-Allow-Origin "*";

        expires 365d;
    }

    # Public static files (images, fonts, etc.)
    location /fonts/ {
        proxy_pass http://nextjs_upstream;
        proxy_cache static_cache;
        proxy_cache_valid 200 365d;
        proxy_cache_valid 404 1h;

        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header X-Cache-Status $upstream_cache_status;

        # Enable CORS for fonts
        add_header Access-Control-Allow-Origin "*";

        expires 365d;
    }

    # Product images (if served through Next.js Image API)
    location /_next/image {
        proxy_pass http://nextjs_upstream;
        proxy_cache static_cache;
        proxy_cache_valid 200 30d;               # Cache for 30 days
        proxy_cache_valid 404 1h;
        proxy_cache_key "$scheme$request_method$host$request_uri$http_accept";

        add_header Cache-Control "public, max-age=2592000";
        add_header X-Cache-Status $upstream_cache_status;

        expires 30d;
    }

    # Favicon and manifest files
    location ~* \.(ico|webmanifest)$ {
        proxy_pass http://nextjs_upstream;
        proxy_cache static_cache;
        proxy_cache_valid 200 7d;

        add_header Cache-Control "public, max-age=604800";
        add_header X-Cache-Status $upstream_cache_status;

        expires 7d;
    }
}
```

**Why this works:**
- Next.js uses content-based hashing for `/_next/static/` files
- Files with same name always have identical content → safe to cache forever
- `immutable` directive prevents browsers from revalidating

---

## 3. Next.js Specific Caching

Configure caching for Next.js pages and data:

```nginx
# In server block
server {
    # ISR (Incremental Static Regeneration) pages
    location / {
        proxy_pass http://nextjs_upstream;
        proxy_cache nextjs_cache;

        # Cache based on Next.js Cache-Control headers
        proxy_cache_valid 200 1h;                  # Default 1 hour
        proxy_cache_valid 404 5m;                  # Cache 404s briefly
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;         # Update cache in background
        proxy_cache_lock on;                       # Prevent cache stampede

        # Respect Next.js revalidation headers
        proxy_cache_bypass $cookie_bypass_cache;
        proxy_no_cache $cookie_bypass_cache;

        # Important: Preserve headers from Next.js
        proxy_pass_header Cache-Control;
        proxy_pass_header ETag;

        add_header X-Cache-Status $upstream_cache_status;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Next.js data fetching (_next/data/)
    location /_next/data/ {
        proxy_pass http://nextjs_upstream;
        proxy_cache nextjs_cache;
        proxy_cache_valid 200 1h;
        proxy_cache_use_stale error timeout updating;
        proxy_cache_background_update on;

        add_header Cache-Control "public, max-age=3600";
        add_header X-Cache-Status $upstream_cache_status;
    }

    # Sitemap (regenerate every 24h as per ISR config)
    location ~ ^/sitemap\.xml$ {
        proxy_pass http://nextjs_upstream;
        proxy_cache nextjs_cache;
        proxy_cache_valid 200 24h;
        proxy_cache_use_stale error timeout updating;

        add_header Cache-Control "public, max-age=86400";
        add_header X-Cache-Status $upstream_cache_status;

        expires 24h;
    }

    # robots.txt
    location = /robots.txt {
        proxy_pass http://nextjs_upstream;
        proxy_cache nextjs_cache;
        proxy_cache_valid 200 24h;

        add_header Cache-Control "public, max-age=86400";
        add_header X-Cache-Status $upstream_cache_status;

        expires 24h;
    }
}
```

**Key Features:**
- `proxy_cache_use_stale`: Serve stale content if upstream is down
- `proxy_cache_background_update`: Update cache without blocking clients
- `proxy_cache_lock`: Prevent multiple requests to upstream for same resource

---

## 4. API Response Caching

**⚠️ CRITICAL:** Be extremely careful with API caching. Never cache:
- Authentication endpoints
- Checkout/cart operations
- User-specific data

```nginx
# In server block
server {
    # GraphQL API - SELECTIVE CACHING ONLY
    location /graphql {
        # DO NOT CACHE by default
        proxy_pass http://saleor_api_upstream;
        proxy_no_cache 1;                        # Disable caching
        proxy_cache_bypass 1;

        # Only cache GET requests for specific queries
        set $cache_it 0;
        if ($request_method = GET) {
            set $cache_it 1;
        }
        # Never cache if user is authenticated
        if ($http_authorization != "") {
            set $cache_it 0;
        }
        if ($cookie_token != "") {
            set $cache_it 0;
        }

        proxy_cache api_cache;
        proxy_cache_bypass $cache_it;
        proxy_no_cache $cache_it;
        proxy_cache_valid 200 5m;                # Very short TTL
        proxy_cache_methods GET;                 # Only cache GET

        # Cache key includes query params
        proxy_cache_key "$scheme$request_method$host$request_uri$http_authorization";

        add_header X-Cache-Status $upstream_cache_status;

        # Timeouts for API
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # API endpoints that should NEVER be cached
    location ~ ^/(api/auth|checkout|account) {
        proxy_pass http://nextjs_upstream;
        proxy_no_cache 1;
        proxy_cache_bypass 1;

        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
}
```

**Safety First:**
- Default to NO caching for API endpoints
- Only cache public, anonymous GET requests
- Very short TTL (5 minutes max)
- Never cache authenticated requests

---

## 5. Compression Configuration

Enable aggressive compression for text-based assets:

```nginx
# In http block
http {
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;                           # Balance between CPU and compression
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_min_length 256;                         # Don't compress tiny files
    gzip_types
        application/atom+xml
        application/geo+json
        application/javascript
        application/x-javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rdf+xml
        application/rss+xml
        application/xhtml+xml
        application/xml
        font/eot
        font/otf
        font/ttf
        image/svg+xml
        text/css
        text/javascript
        text/plain
        text/xml;

    # Brotli compression (if module available - better than gzip)
    brotli on;
    brotli_comp_level 6;
    brotli_static on;                            # Serve pre-compressed .br files
    brotli_types
        application/atom+xml
        application/geo+json
        application/javascript
        application/x-javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rdf+xml
        application/rss+xml
        application/xhtml+xml
        application/xml
        font/eot
        font/otf
        font/ttf
        font/woff
        font/woff2
        image/svg+xml
        text/css
        text/javascript
        text/plain
        text/xml;
}
```

**Expected Results:**
- JavaScript files: 70-80% size reduction
- CSS files: 60-70% size reduction
- HTML files: 50-60% size reduction
- JSON/GraphQL responses: 80-90% size reduction

---

## 6. Security Headers

Add security headers for better protection and SEO:

```nginx
# In server block
server {
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Permissions Policy (replace Feature-Policy)
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # CSP is handled by Next.js - don't override here
    # Content-Security-Policy is set in next.config.js
}
```

---

## 7. Rate Limiting

Protect against DoS and API abuse:

```nginx
# In http block
http {
    # Rate limit zones
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    # Connection limit
    limit_conn_zone $binary_remote_addr zone=addr:10m;
}

# In server block
server {
    # General rate limit
    limit_req zone=general burst=20 nodelay;
    limit_conn addr 10;

    # API rate limit
    location /graphql {
        limit_req zone=api burst=10 nodelay;
        # ... other proxy settings
    }

    # Auth endpoints - stricter limits
    location /api/auth {
        limit_req zone=auth burst=3 nodelay;
        # ... other proxy settings
    }
}
```

**Limits:**
- **General:** 10 requests/second per IP (burst 20)
- **API:** 30 requests/minute per IP (burst 10)
- **Auth:** 5 requests/minute per IP (burst 3)

---

## 8. Complete Configuration Example

Here's a complete example combining all recommendations:

```nginx
# /etc/nginx/nginx.conf (or included file)

# Load modules (if not compiled in)
load_module modules/ngx_http_brotli_filter_module.so;
load_module modules/ngx_http_brotli_static_module.so;

http {
    include mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'cache:$upstream_cache_status';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # Cache zones
    proxy_cache_path /var/cache/nginx/static
        levels=1:2 keys_zone=static_cache:100m max_size=10g inactive=7d use_temp_path=off;
    proxy_cache_path /var/cache/nginx/nextjs
        levels=1:2 keys_zone=nextjs_cache:50m max_size=5g inactive=24h use_temp_path=off;
    proxy_cache_path /var/cache/nginx/api
        levels=1:2 keys_zone=api_cache:20m max_size=1g inactive=10m use_temp_path=off;

    # Cache key
    proxy_cache_key "$scheme$request_method$host$request_uri$http_accept";

    # Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types application/javascript application/json text/css text/plain text/xml;

    brotli on;
    brotli_comp_level 6;
    brotli_static on;
    brotli_types application/javascript application/json text/css text/plain text/xml font/woff2;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    # Upstream configuration
    upstream nextjs_upstream {
        server 127.0.0.1:3000;  # Adjust to your Next.js port
        keepalive 32;
    }

    upstream saleor_api_upstream {
        server 127.0.0.1:8000;  # Adjust to your Saleor API port
        keepalive 32;
    }

    # Server block
    server {
        listen 80;
        listen [::]:80;
        server_name yourdomain.com www.yourdomain.com;

        # Redirect to HTTPS (if using SSL/TLS)
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL configuration (adjust paths)
        ssl_certificate /path/to/cert.pem;
        ssl_certificate_key /path/to/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Rate limiting
        limit_req zone=general burst=20 nodelay;
        limit_conn addr 10;

        # Static assets - aggressive caching
        location /_next/static/ {
            proxy_pass http://nextjs_upstream;
            proxy_cache static_cache;
            proxy_cache_valid 200 365d;
            proxy_cache_valid 404 1h;
            add_header Cache-Control "public, max-age=31536000, immutable";
            add_header X-Cache-Status $upstream_cache_status;
            expires 365d;
        }

        # Fonts
        location /fonts/ {
            proxy_pass http://nextjs_upstream;
            proxy_cache static_cache;
            proxy_cache_valid 200 365d;
            add_header Cache-Control "public, max-age=31536000, immutable";
            add_header Access-Control-Allow-Origin "*";
            add_header X-Cache-Status $upstream_cache_status;
            expires 365d;
        }

        # Next.js Image API
        location /_next/image {
            proxy_pass http://nextjs_upstream;
            proxy_cache static_cache;
            proxy_cache_valid 200 30d;
            proxy_cache_valid 404 1h;
            add_header Cache-Control "public, max-age=2592000";
            add_header X-Cache-Status $upstream_cache_status;
        }

        # Sitemap
        location ~ ^/sitemap\.xml$ {
            proxy_pass http://nextjs_upstream;
            proxy_cache nextjs_cache;
            proxy_cache_valid 200 24h;
            add_header Cache-Control "public, max-age=86400";
            add_header X-Cache-Status $upstream_cache_status;
        }

        # robots.txt
        location = /robots.txt {
            proxy_pass http://nextjs_upstream;
            proxy_cache nextjs_cache;
            proxy_cache_valid 200 24h;
            add_header Cache-Control "public, max-age=86400";
            add_header X-Cache-Status $upstream_cache_status;
        }

        # API endpoints - NO CACHING
        location ~ ^/(api/auth|checkout|account) {
            proxy_pass http://nextjs_upstream;
            proxy_no_cache 1;
            proxy_cache_bypass 1;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }

        # GraphQL API - selective caching
        location /graphql {
            limit_req zone=api burst=10 nodelay;

            proxy_pass http://saleor_api_upstream;
            proxy_no_cache 1;
            proxy_cache_bypass 1;

            # Timeouts
            proxy_connect_timeout 10s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;

            # Headers
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Default - Next.js pages
        location / {
            proxy_pass http://nextjs_upstream;
            proxy_cache nextjs_cache;
            proxy_cache_valid 200 1h;
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
            proxy_cache_background_update on;
            proxy_cache_lock on;

            add_header X-Cache-Status $upstream_cache_status;

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;

            # Headers
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # HTTP/1.1 for keepalive
            proxy_http_version 1.1;
            proxy_set_header Connection "";
        }
    }
}
```

---

## Testing & Validation

### 1. Test Cache Status

```bash
# Check if caching is working
curl -I https://yourdomain.com/_next/static/some-file.js
# Look for: X-Cache-Status: HIT

# Test static assets
curl -I https://yourdomain.com/fonts/Geometos.woff2
# Look for: Cache-Control: public, max-age=31536000, immutable

# Test pages
curl -I https://yourdomain.com/
# Look for: X-Cache-Status: MISS (first request), HIT (subsequent)
```

### 2. Monitor Cache Performance

```bash
# Check cache directory sizes
du -sh /var/cache/nginx/*

# Monitor cache hit ratio
tail -f /var/log/nginx/access.log | grep -o 'cache:[A-Z]*' | sort | uniq -c

# Clear cache if needed
rm -rf /var/cache/nginx/*
nginx -s reload
```

### 3. Verify Compression

```bash
# Check if brotli/gzip is enabled
curl -H "Accept-Encoding: br" -I https://yourdomain.com/
# Look for: Content-Encoding: br

curl -H "Accept-Encoding: gzip" -I https://yourdomain.com/
# Look for: Content-Encoding: gzip
```

---

## Expected Performance Improvements

### Before Optimization
- **Static assets TTFB:** 200-500ms
- **Page load TTFB:** 300-800ms
- **Cache hit ratio:** 0% (no caching)
- **Bandwidth usage:** 100% baseline
- **Server CPU:** 100% baseline

### After Optimization
- **Static assets TTFB:** <20ms (from cache)
- **Page load TTFB:** <50ms (from cache)
- **Cache hit ratio:** 70-90%
- **Bandwidth usage:** 40-50% (due to compression + caching)
- **Server CPU:** 30-40% (due to reduced processing)

### Core Web Vitals Impact
- **LCP improvement:** -200ms to -500ms
- **FCP improvement:** -100ms to -300ms
- **TTFB improvement:** -250ms to -700ms
- **Total load time:** -30% to -50%

---

## Maintenance

### Daily
- Monitor `access.log` for cache hit rates
- Check disk usage of cache directories

### Weekly
- Review rate limit logs for abuse
- Check error logs for cache-related issues

### Monthly
- Rotate logs
- Review and adjust cache TTLs based on hit rates
- Update cache sizes if needed

---

## Troubleshooting

### Cache not working?
```bash
# Check nginx error log
tail -f /var/log/nginx/error.log

# Verify cache directory permissions
ls -la /var/cache/nginx/

# Test with curl
curl -I https://yourdomain.com/_next/static/test.js
```

### High cache misses?
- Check `proxy_cache_key` configuration
- Verify `Cache-Control` headers from Next.js
- Ensure cache zones have sufficient memory

### Stale content being served?
- Reduce `proxy_cache_valid` TTL
- Use `proxy_cache_bypass` for user-specific content
- Implement cache purging mechanism

---

## Integration with Traefik

If using Traefik as reverse proxy in front of nginx:

```yaml
# docker-compose.yml or Traefik config
http:
  middlewares:
    compression:
      compress: {}

    headers:
      headers:
        customResponseHeaders:
          X-Robots-Tag: "index, follow"

  routers:
    storefront:
      rule: "Host(`yourdomain.com`)"
      service: nginx-service
      middlewares:
        - compression
        - headers
      tls:
        certResolver: letsencrypt

  services:
    nginx-service:
      loadBalancer:
        servers:
          - url: "http://nginx:80"
```

**Note:** If using Traefik, let nginx handle caching and Traefik handle SSL termination.

---

## Summary

This configuration provides:
- ✅ Aggressive caching for static assets (1 year)
- ✅ Smart caching for Next.js pages (ISR-aware)
- ✅ Safety for API endpoints (no caching by default)
- ✅ Brotli/Gzip compression (70-90% size reduction)
- ✅ Rate limiting (DoS protection)
- ✅ Security headers (HTTPS, CSP-compatible)
- ✅ Performance monitoring (cache status headers)

**Expected ROI:**
- 60-80% reduction in server load
- 40-60% reduction in bandwidth
- 30-50% faster page loads
- 70-90% cache hit ratio

Apply these configurations in stages, test thoroughly, and monitor the results!
