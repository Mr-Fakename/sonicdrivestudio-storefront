// Service Worker for Progressive Web App capabilities
const CACHE_VERSION = 'v3';
const CACHE_NAME = `saleor-storefront-${CACHE_VERSION}`;

// Request timeout (10 seconds)
const FETCH_TIMEOUT = 10000;

// Assets to cache on install
const STATIC_ASSETS = [
	'/',
	'/site.webmanifest',
];

// Patterns that should NEVER be cached (auth-related and checkout)
const NO_CACHE_PATTERNS = [
	/\/api\/auth\//,
	/\/checkout/,
	/graphql.*tokenRefresh/,
	/graphql.*tokenCreate/,
	/graphql.*tokenVerify/,
	/graphql.*checkout/,
];

// Cache strategies
const CACHE_STRATEGIES = {
	CACHE_FIRST: 'cache-first',
	NETWORK_FIRST: 'network-first',
	NETWORK_ONLY: 'network-only',
	STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
};

// Route strategies
const ROUTE_STRATEGIES = [
	{ pattern: /\.(woff2|woff|ttf|eot)$/, strategy: CACHE_STRATEGIES.CACHE_FIRST },
	{ pattern: /\.(png|jpg|jpeg|svg|gif|webp|avif)$/, strategy: CACHE_STRATEGIES.NETWORK_FIRST },
	{ pattern: /\/api\//, strategy: CACHE_STRATEGIES.NETWORK_ONLY }, // Changed to NETWORK_ONLY for API
	{ pattern: /\/_next\/static\//, strategy: CACHE_STRATEGIES.CACHE_FIRST },
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
	console.log('[SW] Installing service worker...');
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(STATIC_ASSETS).catch((error) => {
				console.error('[SW] Failed to cache static assets:', error);
			});
		})
	);
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	console.log('[SW] Activating service worker...');
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => name.startsWith('saleor-storefront-') && name !== CACHE_NAME)
					.map((name) => {
						console.log('[SW] Deleting old cache:', name);
						return caches.delete(name);
					})
			);
		})
	);
	return self.clients.claim();
});

// Fetch event - handle network requests with appropriate strategies
self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip cross-origin requests
	if (url.origin !== location.origin) {
		return;
	}

	// Check if this is a no-cache pattern (auth-related or checkout)
	const shouldNotCache = NO_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname + url.search));
	if (shouldNotCache) {
		// Never cache auth-related or checkout requests
		return;
	}

	// Skip CSS and JS files - Next.js handles these with its own optimizations
	// Let the browser cache them naturally with the headers from next.config.js
	if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
		return;
	}

	// Skip _next/static files - Next.js handles these with immutable caching
	if (url.pathname.startsWith('/_next/static/')) {
		return;
	}

	// Find matching strategy
	let strategy = CACHE_STRATEGIES.NETWORK_FIRST;
	for (const route of ROUTE_STRATEGIES) {
		if (route.pattern.test(url.pathname)) {
			strategy = route.strategy;
			break;
		}
	}

	// Apply strategy
	switch (strategy) {
		case CACHE_STRATEGIES.CACHE_FIRST:
			event.respondWith(cacheFirst(request));
			break;
		case CACHE_STRATEGIES.NETWORK_FIRST:
			event.respondWith(networkFirst(request));
			break;
		case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
			event.respondWith(staleWhileRevalidate(request));
			break;
		case CACHE_STRATEGIES.NETWORK_ONLY:
		default:
			// Let browser handle it
			break;
	}
});

// Fetch with timeout
async function fetchWithTimeout(request, timeout = FETCH_TIMEOUT) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(request, { signal: controller.signal });
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error.name === 'AbortError') {
			console.warn('[SW] Request timeout:', request.url);
		}
		throw error;
	}
}

// Check if response should be cached
function shouldCacheResponse(response) {
	// Only cache successful responses (2xx and 3xx)
	return response && response.ok && response.status < 400;
}

// Cache first strategy
async function cacheFirst(request) {
	const cache = await caches.open(CACHE_NAME);
	const cached = await cache.match(request);

	if (cached) {
		return cached;
	}

	try {
		const response = await fetchWithTimeout(request);
		if (shouldCacheResponse(response)) {
			cache.put(request, response.clone());
		}
		return response;
	} catch (error) {
		console.error('[SW] Cache first fetch failed:', error);
		throw error;
	}
}

// Network first strategy
async function networkFirst(request) {
	const cache = await caches.open(CACHE_NAME);

	try {
		const response = await fetchWithTimeout(request);
		if (shouldCacheResponse(response)) {
			cache.put(request, response.clone());
			// Notify clients about cache update for images
			if (/\.(png|jpg|jpeg|svg|gif|webp|avif)$/.test(request.url)) {
				notifyClientsOfUpdate(request.url);
			}
		}
		return response;
	} catch (error) {
		console.warn('[SW] Network first fetch failed, trying cache:', error.message);
		const cached = await cache.match(request);
		if (cached) {
			return cached;
		}
		throw error;
	}
}

// Notify all clients about cache updates
async function notifyClientsOfUpdate(url) {
	const clients = await self.clients.matchAll({ type: 'window' });
	clients.forEach((client) => {
		client.postMessage({
			type: 'CACHE_UPDATED',
			url: url,
		});
	});
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
	const cache = await caches.open(CACHE_NAME);
	const cached = await cache.match(request);

	const fetchPromise = fetchWithTimeout(request).then((response) => {
		if (shouldCacheResponse(response)) {
			cache.put(request, response.clone());
		}
		return response;
	}).catch(error => {
		console.warn('[SW] Stale while revalidate fetch failed:', error.message);
		return cached;
	});

	return cached || fetchPromise;
}

// Handle messages from clients
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		console.log('[SW] Received SKIP_WAITING message');
		self.skipWaiting();
	}

	if (event.data && event.data.type === 'CLEAR_IMAGE_CACHE') {
		console.log('[SW] Received CLEAR_IMAGE_CACHE message');
		event.waitUntil(clearImageCache());
	}

	if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
		console.log('[SW] Received CLEAR_ALL_CACHES message');
		event.waitUntil(clearAllCaches());
	}
});

// Clear image cache on demand
async function clearImageCache() {
	console.log('[SW] Clearing image cache...');
	const cache = await caches.open(CACHE_NAME);
	const keys = await cache.keys();
	const imageKeys = keys.filter((request) =>
		/\.(png|jpg|jpeg|svg|gif|webp|avif)$/.test(request.url)
	);
	await Promise.all(imageKeys.map((key) => cache.delete(key)));
	console.log('[SW] Image cache cleared:', imageKeys.length, 'items');
}

// Clear all caches (used on auth errors)
async function clearAllCaches() {
	console.log('[SW] Clearing all caches...');
	const cacheNames = await caches.keys();
	await Promise.all(
		cacheNames.map(cacheName => {
			console.log('[SW] Deleting cache:', cacheName);
			return caches.delete(cacheName);
		})
	);
	console.log('[SW] All caches cleared');
}
