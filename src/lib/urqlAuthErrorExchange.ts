import { type Exchange } from "urql";
import { pipe, tap } from "wonka";

/**
 * Aggressively clear ALL cookies
 * Safe to call since important data is stored in localStorage
 */
function clearAllCookies() {
	console.log("[AUTH] Clearing all cookies...");
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

	console.log("[AUTH] All cookies cleared. Remaining:", document.cookie);
}

/**
 * URQL error exchange that handles JWT signature expiration errors
 * Properly logs out the user and reloads the page when tokens expire
 */
export const authErrorExchange: Exchange =
	({ forward }) =>
	(ops$) => {
		return pipe(
			forward(ops$),
			tap(({ error }) => {
				if (!error) {
					return;
				}

				// Log all errors for debugging
				console.log("[AUTH] URQL Error detected:", {
					message: error.message,
					graphQLErrors: error.graphQLErrors,
					networkError: error.networkError,
				});

				// Check if any error message indicates signature expiration
				const isSignatureExpired =
					error.message?.includes("Signature has expired") ||
					error.message?.includes("Invalid token") ||
					error.message?.includes("JWT") ||
					error.graphQLErrors?.some(
						(e) =>
							e.message?.includes("Signature has expired") ||
							e.message?.includes("Invalid token") ||
							e.message?.includes("JWT"),
					);

				if (isSignatureExpired) {
					console.warn("[AUTH] JWT signature expired (client-side), logging out user...");
					console.log("[AUTH] Current cookies before logout:", document.cookie);

					// Clear ALL cookies (safe since important data is in localStorage)
					clearAllCookies();

					// Send message to Service Worker to clear all caches
					if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
						console.log("[AUTH] Sending message to Service Worker to clear all caches...");
						navigator.serviceWorker.controller.postMessage({
							type: "CLEAR_ALL_CACHES",
						});
					}

					console.log("[AUTH] Redirecting to home page immediately...");
					// Small delay to let SW clear caches
					setTimeout(() => {
						window.location.href = "/";
					}, 100);
				}
			}),
		);
	};
