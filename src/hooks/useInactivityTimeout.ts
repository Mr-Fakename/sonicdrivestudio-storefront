"use client";

import { useEffect, useRef, useCallback } from "react";

// 12 minutes of inactivity before logout (within 10-15 minute requirement)
const INACTIVITY_TIMEOUT_MS = 12 * 60 * 1000;

// Events that indicate user activity
const ACTIVITY_EVENTS = [
	"mousedown",
	"mousemove",
	"keydown",
	"scroll",
	"touchstart",
	"click",
	"wheel",
] as const;

// Helper to clear all cookies
const clearAllCookies = () => {
	if (typeof document === "undefined") return;

	const cookies = document.cookie.split(";");
	for (const cookie of cookies) {
		const name = cookie.split("=")[0].trim();
		if (!name) continue;

		// Try multiple variations to ensure cookie is deleted
		const variations = [
			`${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`,
			`${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname};`,
			`${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax;`,
			`${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict;`,
		];
		variations.forEach((v) => {
			document.cookie = v;
		});
	}
};

interface UseInactivityTimeoutOptions {
	/** Whether the user is currently authenticated */
	isAuthenticated: boolean;
	/** Callback to execute before logout (optional) */
	onBeforeLogout?: () => void;
	/** Custom timeout duration in milliseconds (default: 12 minutes) */
	timeoutMs?: number;
}

/**
 * Hook that monitors user activity and triggers logout after a period of inactivity.
 * This helps prevent stale sessions that can cause conflicts during checkout.
 *
 * Only activates when the user is authenticated.
 */
export const useInactivityTimeout = ({
	isAuthenticated,
	onBeforeLogout,
	timeoutMs = INACTIVITY_TIMEOUT_MS,
}: UseInactivityTimeoutOptions) => {
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isLoggingOutRef = useRef(false);

	const handleLogout = useCallback(() => {
		if (isLoggingOutRef.current) return;
		isLoggingOutRef.current = true;

		console.warn("[INACTIVITY] Session timed out due to inactivity, logging out user...");

		// Execute optional callback
		onBeforeLogout?.();

		// Clear all cookies
		clearAllCookies();

		// Clear service worker caches if available
		if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({
				type: "CLEAR_ALL_CACHES",
			});
		}

		// Redirect to clear session endpoint for thorough cleanup
		setTimeout(() => {
			window.location.href = "/api/auth/clear-session";
		}, 100);
	}, [onBeforeLogout]);

	const resetTimer = useCallback(() => {
		// Clear existing timeout
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}

		// Only set new timeout if authenticated
		if (isAuthenticated && !isLoggingOutRef.current) {
			timeoutRef.current = setTimeout(handleLogout, timeoutMs);
		}
	}, [isAuthenticated, handleLogout, timeoutMs]);

	useEffect(() => {
		// Only activate for authenticated users
		if (!isAuthenticated) {
			// Clear any existing timeout when user logs out
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
			isLoggingOutRef.current = false;
			return;
		}

		// Start the initial timer
		resetTimer();

		// Add event listeners for activity detection
		const handleActivity = () => {
			resetTimer();
		};

		// Use passive listeners for better performance
		const options: AddEventListenerOptions = { passive: true };

		for (const event of ACTIVITY_EVENTS) {
			window.addEventListener(event, handleActivity, options);
		}

		// Also listen for visibility changes - reset timer when tab becomes visible
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				resetTimer();
			}
		};
		document.addEventListener("visibilitychange", handleVisibilityChange);

		// Cleanup
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}

			for (const event of ACTIVITY_EVENTS) {
				window.removeEventListener(event, handleActivity);
			}
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [isAuthenticated, resetTimer]);

	// Return methods for external control if needed
	return {
		resetTimer,
	};
};
