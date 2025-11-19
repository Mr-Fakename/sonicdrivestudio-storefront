import { type Exchange } from "urql";
import { pipe, tap } from "wonka";
import { saleorAuthClient } from "@/ui/components/AuthProvider";

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

					// Properly sign out through the auth SDK
					// This will trigger onSignedOut callback and clean up all auth state
					saleorAuthClient.signOut();

					console.log("[AUTH] Cookies after signOut:", document.cookie);
					console.log("[AUTH] Redirecting to home page in 1 second...");

					// Redirect to home page after brief delay to allow signOut to complete
					setTimeout(() => {
						console.log("[AUTH] Executing redirect...");
						window.location.href = "/";
					}, 1000);
				}
			}),
		);
	};
