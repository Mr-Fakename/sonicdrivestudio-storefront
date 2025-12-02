/**
 * Web Vitals Reporting Component
 *
 * Reports Core Web Vitals metrics using the web-vitals library.
 * This component should be placed in the root layout.
 */

'use client';

import { useEffect } from 'react';
import { useReportWebVitals } from 'next/web-vitals';
import { reportWebVitals } from '@/lib/performance';

export function WebVitals() {
	useReportWebVitals((metric) => {
		reportWebVitals({
			id: metric.id,
			name: metric.name,
			value: metric.value,
			rating: metric.rating,
			delta: metric.delta,
			entries: [],
		});
	});

	// Track page load performance
	useEffect(() => {
		if (typeof window === 'undefined') return;

		const logPageLoadMetrics = () => {
			if (!performance.getEntriesByType) return;

			const paintEntries = performance.getEntriesByType('paint');
			const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint');

			const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
			const navEntry = navEntries[0];

			if (process.env.NODE_ENV === 'development' && navEntry) {
				console.log('[Page Load Metrics]', {
					'DNS Lookup': `${(navEntry.domainLookupEnd - navEntry.domainLookupStart).toFixed(2)}ms`,
					'TCP Connection': `${(navEntry.connectEnd - navEntry.connectStart).toFixed(2)}ms`,
					'TLS Negotiation': navEntry.secureConnectionStart
						? `${(navEntry.connectEnd - navEntry.secureConnectionStart).toFixed(2)}ms`
						: 'N/A',
					'Request': `${(navEntry.responseStart - navEntry.requestStart).toFixed(2)}ms`,
					'Response': `${(navEntry.responseEnd - navEntry.responseStart).toFixed(2)}ms`,
					'DOM Processing': `${(navEntry.domComplete - navEntry.responseEnd).toFixed(2)}ms`,
					'Load Event': `${(navEntry.loadEventEnd - navEntry.loadEventStart).toFixed(2)}ms`,
					'FCP': fcpEntry ? `${fcpEntry.startTime.toFixed(2)}ms` : 'N/A',
					'Total': `${navEntry.loadEventEnd.toFixed(2)}ms`,
				});
			}
		};

		// Wait for page load to complete
		if (document.readyState === 'complete') {
			logPageLoadMetrics();
		} else {
			window.addEventListener('load', logPageLoadMetrics);
			return () => window.removeEventListener('load', logPageLoadMetrics);
		}
	}, []);

	return null;
}
