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
				if (result.error || (result.data && "errors" in result)) {
					// Filter out checkout.user permission errors
					const filteredErrors = result.error?.graphQLErrors?.filter((error: any) => {
						// Check if this is a permission error for checkout.user field
						const isCheckoutUserPermissionError =
							error.path &&
							error.path.length >= 2 &&
							error.path[0] === "checkout" &&
							error.path[1] === "user" &&
							error.extensions?.exception?.code === "PermissionDenied";

						// Keep all errors except checkout.user permission errors
						return !isCheckoutUserPermissionError;
					});

					// If we filtered out all errors, clear the error
					if (filteredErrors && filteredErrors.length === 0) {
						return {
							...result,
							error: undefined,
						};
					}

					// If we filtered some but not all errors, update the error
					if (filteredErrors && filteredErrors.length !== result.error?.graphQLErrors?.length) {
						return {
							...result,
							error: {
								...result.error!,
								graphQLErrors: filteredErrors,
							},
						};
					}
				}

				return result;
			}),
		);
	};
};
