/**
 * Lazy-loaded Stripe Component
 *
 * This component uses Next.js dynamic import to lazy load Stripe
 * payment components only when needed, reducing initial bundle size.
 *
 * Bundle size savings: ~150KB (Stripe SDK + React Stripe.js)
 */

"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Lazy load the Stripe component with loading state
const StripeComponent = dynamic(
	() => import("./OptimizedStripeComponent").then((mod) => ({ default: mod.OptimizedStripeComponent })),
	{
		loading: () => (
			<div className="flex min-h-[200px] items-center justify-center">
				<div className="text-center">
					<div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
					<p className="mt-4 text-sm text-base-400">Loading payment method...</p>
				</div>
			</div>
		),
		ssr: false, // Stripe should only load client-side
	},
);

/**
 * Wrapper component with Suspense boundary for additional safety
 */
export const LazyStripeComponent = () => {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-[200px] items-center justify-center">
					<div className="text-center">
						<div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
						<p className="mt-4 text-sm text-base-400">Loading payment method...</p>
					</div>
				</div>
			}
		>
			<StripeComponent />
		</Suspense>
	);
};
