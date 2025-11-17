import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Route handler to clear authentication cookies when JWT signature expires
 * This is a Route Handler (not a Server Component) so it can modify cookies
 */
export async function GET() {
	console.warn("[AUTH] Clearing expired session cookies...");

	const cookieStore = await cookies();

	// Clear auth cookies
	cookieStore.delete("saleor-access-token");
	cookieStore.delete("saleor-refresh-token");

	// Redirect to home page with clean state
	// Using redirect() ensures proper URL handling regardless of environment
	redirect("/");
}
