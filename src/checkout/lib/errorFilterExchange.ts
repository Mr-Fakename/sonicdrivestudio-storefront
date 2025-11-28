import { type Exchange } from "urql";
import { pipe, map } from "wonka";

/**
 * Custom urql exchange that filters out specific GraphQL errors.
 * This is used to ignore permission errors for checkout.user field
 * which occur during login/logout when checkout is updated.
 */
export const errorFilterExchange: Exchange = ({ forward }) => {
	return (ops$) => {
		return pipe(
			forward(ops$),
			map((result) => {
				// Helper function to check if an error should be filtered
				const shouldFilterError = (error: any): boolean => {
					// Check if this is a permission error for checkout.user field
					const isCheckoutUserPermissionError =
						error.path &&
						error.path.length >= 2 &&
						error.path[0] === "checkout" &&
						error.path[1] === "user" &&
						error.extensions?.exception?.code === "PermissionDenied";

					// Filter out checkout.user permission errors
					return isCheckoutUserPermissionError;
				};

				// Check if there are any GraphQL errors to filter
				if (result.error?.graphQLErrors && result.error.graphQLErrors.length > 0) {
					const filteredErrors = result.error.graphQLErrors.filter(
						(error: any) => !shouldFilterError(error),
					);

					// If we filtered out all errors, clear the error completely
					if (filteredErrors.length === 0) {
						return {
							...result,
							error: undefined,
						};
					}

					// If we filtered some but not all errors, update the error
					if (filteredErrors.length !== result.error.graphQLErrors.length) {
						return {
							...result,
							error: {
								...result.error,
								graphQLErrors: filteredErrors,
								message: filteredErrors.map((e: any) => e.message).join(", "),
							},
						};
					}
				}

				return result;
			}),
		);
	};
};
