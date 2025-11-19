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
				if (!error) return;

				// Check if any error message indicates signature expiration
				const isSignatureExpired =
					error.message?.includes("Signature has expired") ||
					error.graphQLErrors?.some((e) => e.message?.includes("Signature has expired"));

				if (isSignatureExpired) {
					console.warn("[AUTH] JWT signature expired (client-side), logging out user...");

					// Properly sign out through the auth SDK
					// This will trigger onSignedOut callback and clean up all auth state
					void saleorAuthClient.signOut();

					// Redirect to home page after brief delay to allow signOut to complete
					setTimeout(() => {
						window.location.href = "/";
					}, 500);
				}
			}),
		);
	};
