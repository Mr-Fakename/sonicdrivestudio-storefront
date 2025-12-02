/**
 * Web Vitals Performance Monitoring
 *
 * Utilities for tracking Core Web Vitals and custom performance metrics.
 * These can be integrated with analytics services like Google Analytics, Vercel Analytics, etc.
 */

export interface Metric {
	id: string;
	name: string;
	value: number;
	rating: 'good' | 'needs-improvement' | 'poor';
	delta: number;
	entries: PerformanceEntry[];
}

export interface WebVitalsMetrics {
	CLS?: number;
	FID?: number;
	FCP?: number;
	LCP?: number;
	TTFB?: number;
	INP?: number;
}

/**
 * Get rating for Core Web Vitals metrics
 */
export function getMetricRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
	const thresholds: Record<string, { good: number; poor: number }> = {
		CLS: { good: 0.1, poor: 0.25 },
		FID: { good: 100, poor: 300 },
		FCP: { good: 1800, poor: 3000 },
		LCP: { good: 2500, poor: 4000 },
		TTFB: { good: 800, poor: 1800 },
		INP: { good: 200, poor: 500 },
	};

	const threshold = thresholds[name];
	if (!threshold) return 'good';

	if (value <= threshold.good) return 'good';
	if (value <= threshold.poor) return 'needs-improvement';
	return 'poor';
}

/**
 * Report Web Vitals to console (development)
 * Replace with your analytics integration in production
 */
export function reportWebVitals(metric: Metric) {
	const { name, value, rating, id } = metric;

	// Log to console in development
	if (process.env.NODE_ENV === 'development') {
		console.log(`[Web Vitals] ${name}:`, {
			value: `${Math.round(name === 'CLS' ? value * 1000 : value)}${name === 'CLS' ? '' : 'ms'}`,
			rating,
			id,
		});
	}

	// Send to analytics in production
	if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
		// Example: Google Analytics
		if ('gtag' in window && typeof (window as any).gtag === 'function') {
			(window as any).gtag('event', name, {
				event_category: 'Web Vitals',
				value: Math.round(name === 'CLS' ? value * 1000 : value),
				event_label: id,
				non_interaction: true,
			});
		}

		// Example: Custom endpoint
		// fetch('/api/analytics/web-vitals', {
		//   method: 'POST',
		//   body: JSON.stringify({ name, value, rating, id }),
		//   headers: { 'Content-Type': 'application/json' },
		// }).catch(() => {});
	}
}

/**
 * Measure custom performance metrics
 */
export function measurePerformance(name: string, callback: () => void | Promise<void>) {
	const startTime = performance.now();

	const finish = () => {
		const duration = performance.now() - startTime;

		if (process.env.NODE_ENV === 'development') {
			console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
		}

		// Mark performance entry
		if (performance.mark) {
			performance.mark(`${name}-end`);
			performance.measure(name, `${name}-start`, `${name}-end`);
		}
	};

	if (performance.mark) {
		performance.mark(`${name}-start`);
	}

	const result = callback();

	if (result instanceof Promise) {
		return result.finally(finish);
	}

	finish();
	return result;
}

/**
 * Track lazy component loading time
 */
export function trackComponentLoad(componentName: string) {
	const startTime = performance.now();

	return () => {
		const loadTime = performance.now() - startTime;

		if (process.env.NODE_ENV === 'development') {
			console.log(`[Component Load] ${componentName}: ${loadTime.toFixed(2)}ms`);
		}

		// Send to analytics
		if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
			if ('gtag' in window && typeof (window as any).gtag === 'function') {
				(window as any).gtag('event', 'component_load', {
					event_category: 'Performance',
					event_label: componentName,
					value: Math.round(loadTime),
					non_interaction: true,
				});
			}
		}
	};
}

/**
 * Get current Web Vitals metrics
 */
export function getCurrentWebVitals(): WebVitalsMetrics | null {
	if (typeof window === 'undefined' || !performance.getEntriesByType) {
		return null;
	}

	const metrics: WebVitalsMetrics = {};

	// Get paint timing
	const paintEntries = performance.getEntriesByType('paint');
	const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
	if (fcpEntry) {
		metrics.FCP = fcpEntry.startTime;
	}

	// Get navigation timing
	const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
	if (navEntries.length > 0) {
		const navEntry = navEntries[0];
		metrics.TTFB = navEntry.responseStart - navEntry.requestStart;
	}

	// LCP, CLS, FID, INP are collected via web-vitals library
	// This is just for manual checking

	return metrics;
}

/**
 * Performance budget checker
 */
export interface PerformanceBudget {
	CLS: number;
	FID: number;
	FCP: number;
	LCP: number;
	TTFB: number;
}

export const PERFORMANCE_BUDGET: PerformanceBudget = {
	CLS: 0.1,
	FID: 100,
	FCP: 1800,
	LCP: 2500,
	TTFB: 800,
};

export function checkPerformanceBudget(metrics: WebVitalsMetrics): {
	passed: boolean;
	violations: string[];
} {
	const violations: string[] = [];

	Object.entries(metrics).forEach(([name, value]) => {
		const budget = PERFORMANCE_BUDGET[name as keyof PerformanceBudget];
		if (budget && value && value > budget) {
			violations.push(`${name}: ${value.toFixed(2)}ms (budget: ${budget}ms)`);
		}
	});

	return {
		passed: violations.length === 0,
		violations,
	};
}
