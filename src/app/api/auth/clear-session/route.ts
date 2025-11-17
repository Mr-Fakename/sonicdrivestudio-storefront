import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Route handler to clear authentication cookies when JWT signature expires
 * This is a Route Handler (not a Server Component) so it can modify cookies
 */
export async function GET(request: Request) {
	console.warn("[AUTH] Clearing expired session cookies...");

	const cookieStore = await cookies();

	// Clear auth cookies
	cookieStore.delete("saleor-access-token");
	cookieStore.delete("saleor-refresh-token");

	// Get the origin from the request to build the redirect URL
	const url = new URL(request.url);
	const redirectUrl = new URL("/", url.origin);

	// Redirect to home page with clean state
	return NextResponse.redirect(redirectUrl);
}
