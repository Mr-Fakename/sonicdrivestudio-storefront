"use client";

import { useState, useEffect } from "react";

const BANNER_STORAGE_KEY = "construction-banner-dismissed";

export function ConstructionBanner() {
	const [isDismissed, setIsDismissed] = useState(true); // Start as dismissed to prevent flash

	useEffect(() => {
		// Check if banner was dismissed
		const dismissed = localStorage.getItem(BANNER_STORAGE_KEY);
		setIsDismissed(dismissed === "true");
	}, []);

	const handleDismiss = () => {
		localStorage.setItem(BANNER_STORAGE_KEY, "true");
		setIsDismissed(true);
	};

	if (isDismissed) {
		return null;
	}

	return (
		<div className="relative bg-accent-900/30 backdrop-blur-sm border-b border-accent-800/50">
			<div className="mx-auto max-w-7xl px-6 py-3">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3 text-sm text-base-200">
						<svg
							className="h-5 w-5 flex-shrink-0 text-accent-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<p>
							<span className="font-medium text-white">Website currently under construction.</span>{" "}
							<span className="text-base-300">Found a bug? Please reach out to </span>
							<a
								href="mailto:hello@daybreakdevelopment.com"
								className="text-accent-300 underline decoration-accent-500/30 underline-offset-2 transition-colors hover:text-accent-200 hover:decoration-accent-400/50"
							>
								hello@daybreakdevelopment.com
							</a>
						</p>
					</div>
					<button
						onClick={handleDismiss}
						className="flex-shrink-0 rounded p-1 text-base-400 transition-colors hover:bg-accent-800/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-transparent"
						aria-label="Dismiss banner"
					>
						<svg
							className="h-5 w-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
}
