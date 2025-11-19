"use client";

import { useEffect, useState } from "react";
import { clearInvalidAuthCookies } from "./actions";

/**
 * Aggressively clear ALL cookies
 * Safe to call since important data is stored in localStorage
 */
function clearAllCookies() {
	console.log("[ERROR BOUNDARY] Clearing all cookies...");
	const cookies = document.cookie.split(";");

	for (let i = 0; i < cookies.length; i++) {
		const cookie = cookies[i];
		const eqPos = cookie.indexOf("=");
		const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();

		// Delete cookie for all possible paths and domains
		document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
		document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname};`;
		document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.${window.location.hostname};`;
	}

	console.log("[ERROR BOUNDARY] All cookies cleared. Remaining:", document.cookie);
}

function isAuthError(error: Error): boolean {
	return (
		error.message.includes("Signature has expired") ||
		error.message.includes("Invalid token") ||
		error.message.includes("JWT") ||
		error.message.includes("Authentication") ||
		error.message.includes("Cookies can only be modified")
	);
}

function isServerError(error: Error): boolean {
	return (
		error.message.includes("Failed to parse API response as JSON") ||
		error.message.includes("The server returned an invalid response") ||
		error.message.includes("HTTP error 500")
	);
}

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
	const [isHandlingAuthError, setIsHandlingAuthError] = useState(false);

	useEffect(() => {
		console.error("[ERROR BOUNDARY] Error caught:", error);

		// If this is an authentication error, automatically clear cookies and refresh
		if (isAuthError(error) && !isHandlingAuthError) {
			setIsHandlingAuthError(true);
			console.log("[ERROR BOUNDARY] Detected authentication error, clearing invalid cookies and refreshing...");
			console.log("[ERROR BOUNDARY] Current cookies:", document.cookie);

			clearInvalidAuthCookies()
				.then(() => {
					console.log("[ERROR BOUNDARY] Cookies cleared, reloading page...");
					// Refresh the page to re-render with cleared cookies
					window.location.reload();
				})
				.catch((err) => {
					console.error("[ERROR BOUNDARY] Failed to clear invalid cookies:", err);
					// Even if clearing fails, try to refresh
					window.location.reload();
				});
		}

		// If this is a server error (like invalid JSON response), also clear cookies
		// as it might be due to expired session causing API errors
		if (isServerError(error) && !isHandlingAuthError) {
			setIsHandlingAuthError(true);
			console.log("[ERROR BOUNDARY] Detected server error, clearing cookies and refreshing...");

			clearInvalidAuthCookies()
				.then(() => {
					console.log("[ERROR BOUNDARY] Cookies cleared, reloading page...");
					// Refresh the page to re-render with cleared cookies
					window.location.reload();
				})
				.catch((err) => {
					console.error("[ERROR BOUNDARY] Failed to clear invalid cookies:", err);
					// Even if clearing fails, try to refresh
					window.location.reload();
				});
		}
	}, [error, isHandlingAuthError]);

	// If handling auth or server error, show a loading state
	if (isAuthError(error) || isServerError(error)) {
		const isAuth = isAuthError(error);
		return (
			<div className="bg-white">
				<div className="mx-auto max-w-7xl px-6 py-12">
					<h1 className="text-2xl font-bold leading-10 tracking-tight text-neutral-800">
						{isAuth ? "Session expired" : "Server error detected"}
					</h1>
					<p className="mt-6 max-w-2xl text-base leading-7 text-neutral-600">
						{isAuth
							? "Your session has expired. Refreshing the page..."
							: "A server error occurred. Clearing session and refreshing..."}
					</p>
					<div className="mt-8">
						<div className="h-2 w-48 animate-pulse rounded-full bg-neutral-200"></div>
					</div>
				</div>
			</div>
		);
	}

	const handleRetry = () => {
		console.log("[ERROR BOUNDARY] Retry button clicked");
		console.log("[ERROR BOUNDARY] Current cookies before clearing:", document.cookie);

		// Clear ALL cookies (safe since important data is in localStorage)
		clearAllCookies();

		// Force reload immediately
		console.log("[ERROR BOUNDARY] Reloading page...");
		window.location.reload();
	};

	return (
		<div className="bg-white">
			<div className="mx-auto max-w-7xl px-6 py-12">
				<h1 className="text-2xl font-bold leading-10 tracking-tight text-neutral-800">
					Something went wrong
				</h1>
				<p className="mt-6 max-w-2xl text-base leading-7 text-neutral-600">
					<code>{error.message}</code>
				</p>
				<button
					className="mt-8 h-10 rounded-md bg-red-500 px-6 font-semibold text-white"
					onClick={handleRetry}
				>
					Try again
				</button>
			</div>
		</div>
	);
}
