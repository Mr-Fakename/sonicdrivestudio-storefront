import { invariant } from "ts-invariant";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { type TypedDocumentString } from "../gql/graphql";
import { getServerAuthClient } from "@/app/config";

type GraphQLErrorResponse = {
	errors: readonly {
		message: string;
	}[];
};

type GraphQLRespone<T> = { data: T } | GraphQLErrorResponse;

export async function executeGraphQL<Result, Variables>(
	operation: TypedDocumentString<Result, Variables>,
	options: {
		headers?: HeadersInit;
		cache?: RequestCache;
		revalidate?: number;
		withAuth?: boolean;
		tags?: string[];
	} & (Variables extends Record<string, never> ? { variables?: never } : { variables: Variables }),
): Promise<Result> {
	invariant(process.env.NEXT_PUBLIC_SALEOR_API_URL, "Missing NEXT_PUBLIC_SALEOR_API_URL env variable");
	const { variables, headers, cache, revalidate, withAuth = true, tags } = options;

	// Create a cache key for unstable_cache when revalidate is set and not using auth
	const shouldUseCache = revalidate !== undefined && cache !== "no-cache" && !withAuth;

	const fetchData = async () => {
		const apiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
		invariant(apiUrl, "Missing NEXT_PUBLIC_SALEOR_API_URL env variable");

		const input = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...headers,
			},
			body: JSON.stringify({
				query: operation.toString(),
				...(variables && { variables }),
			}),
			cache: cache,
			next: { revalidate, tags },
		};

		let response: Response;

		if (withAuth) {
			try {
				response = await (await getServerAuthClient()).fetchWithAuth(apiUrl, input);
			} catch (error) {
				// Handle authentication errors gracefully by falling back to unauthenticated requests
				const isAuthError =
					error instanceof Error &&
					(error.message.includes("Cookies can only be modified") ||
						error.message.includes("Signature has expired") ||
						error.message.includes("Invalid token") ||
						error.message.includes("JWT") ||
						error.message.includes("Authentication"));

				if (isAuthError) {
					console.warn(
						"[AUTH GRAPHQL] Authentication error encountered during fetchWithAuth:",
						error instanceof Error ? error.message : error,
					);

					// If signature has expired, we should clear the session
					if (error instanceof Error && error.message.includes("Signature has expired")) {
						console.warn("[AUTH GRAPHQL] JWT signature expired during fetch, redirecting to /api/auth/clear-session to logout user...");
						redirect("/api/auth/clear-session");
					}

					// Fall back to unauthenticated request when tokens are invalid/expired
					console.warn("[AUTH GRAPHQL] Falling back to unauthenticated request...");
					response = await fetch(apiUrl, input);
				} else {
					throw error;
				}
			}
		} else {
			response = await fetch(apiUrl, input);
		}

		if (!response.ok) {
			const body = await (async () => {
				try {
					return await response.text();
				} catch {
					return "";
				}
			})();
			console.error(input.body);
			throw new HTTPError(response, body);
		}

		// Safely parse JSON response with error handling for non-JSON responses
		let body: GraphQLRespone<Result>;
		try {
			// First check Content-Type header as a quick validation
			const contentType = response.headers.get("content-type");
			if (contentType && !contentType.includes("application/json")) {
				console.warn("[GraphQL] Unexpected content type:", contentType);
			}

			// Attempt to parse as JSON
			body = (await response.json()) as GraphQLRespone<Result>;
		} catch (error) {
			// If JSON parsing fails, it's likely HTML or other non-JSON content
			if (error instanceof SyntaxError) {
				// Clone the response to read it again (if not already consumed)
				let bodyPreview = "Unable to read response body";
				try {
					// Response body can only be read once, so we can't get it here
					// Log what we know from the error
					bodyPreview = error.message;
				} catch {
					// Ignore
				}

				console.error("[GraphQL] Failed to parse JSON response:", {
					status: response.status,
					statusText: response.statusText,
					contentType: response.headers.get("content-type"),
					error: error.message,
				});

				throw new Error(
					`Failed to parse API response as JSON. The server returned an invalid response (likely an error page). Status: ${response.status} ${response.statusText}`,
				);
			}
			throw error;
		}

		if ("errors" in body) {
			// Check for signature expiration errors
			const hasSignatureExpired = body.errors.some((error) =>
				error.message?.includes("Signature has expired"),
			);

			if (hasSignatureExpired) {
				console.warn("[AUTH GRAPHQL] JWT signature expired in GraphQL response, redirecting to /api/auth/clear-session to logout user...");

				// Redirect to route handler that clears cookies and redirects home
				// We can't clear cookies here because Next.js only allows cookie
				// modification in Server Actions or Route Handlers
				redirect("/api/auth/clear-session");
			}

			throw new GraphQLError(body);
		}

		return body.data;
	};

	// Use unstable_cache for public, cacheable queries
	if (shouldUseCache) {
		const cacheKey = [operation.toString(), JSON.stringify(variables)];
		const cachedFetch = unstable_cache(fetchData, cacheKey, {
			revalidate,
			tags: tags || [],
		});
		return cachedFetch();
	}

	return fetchData();
}

class GraphQLError extends Error {
	constructor(public errorResponse: GraphQLErrorResponse) {
		const message = errorResponse.errors.map((error) => error.message).join("\n");
		super(message);
		this.name = this.constructor.name;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}
class HTTPError extends Error {
	constructor(response: Response, body: string) {
		const message = `HTTP error ${response.status}: ${response.statusText}\n${body}`;
		super(message);
		this.name = this.constructor.name;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}
