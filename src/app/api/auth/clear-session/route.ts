import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

	// Return an HTML page that immediately redirects to home
	// This prevents "Connection closed" message from appearing
	const html = `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="utf-8">
				<title>Redirecting...</title>
				<script>
					window.location.href = '/';
				</script>
			</head>
			<body style="margin:0;padding:0;"></body>
		</html>
	`;

	return new NextResponse(html, {
		status: 200,
		headers: {
			"Content-Type": "text/html",
		},
	});
}
