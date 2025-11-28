"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
	useEffect(() => {
		// Register service worker in production for PWA support and offline caching
		if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
			void navigator.serviceWorker
				.register("/sw.js")
				.then((registration) => {
					if (process.env.NODE_ENV === "development") {
						// Only log in development
						// eslint-disable-next-line no-console
						console.log("Service Worker registered:", registration);
					}

					// Check for updates periodically
					setInterval(() => {
						void registration.update();
					}, 60000); // Check every minute

					// Handle updates
					registration.addEventListener("updatefound", () => {
						const newWorker = registration.installing;
						if (!newWorker) return;

						newWorker.addEventListener("statechange", () => {
							if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
								// New service worker available - could dispatch custom event
								// for app-level update notification UI
								window.dispatchEvent(new CustomEvent("sw-update-available"));
							}
						});
					});
				})
				.catch((error) => {
					// Only log errors in development or to error tracking service
					if (process.env.NODE_ENV === "development") {
						// eslint-disable-next-line no-console
						console.error("Service Worker registration failed:", error);
					}
				});
		}
	}, []);

	return null;
}
