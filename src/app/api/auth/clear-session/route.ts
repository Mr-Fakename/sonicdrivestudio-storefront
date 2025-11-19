import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Route handler to clear ALL cookies when JWT signature expires
 * This is a Route Handler (not a Server Component) so it can modify cookies
 */
export async function GET() {
	console.warn("[AUTH CLEAR-SESSION] Clearing expired session - deleting ALL cookies...");

	const cookieStore = await cookies();

	// Get all cookies and delete them
	const allCookies = cookieStore.getAll();
	console.log(`[AUTH CLEAR-SESSION] Found ${allCookies.length} cookies to clear:`, allCookies.map(c => c.name).join(", "));

	// Delete ALL cookies (safe since important data is in localStorage)
	for (const cookie of allCookies) {
		console.log(`[AUTH CLEAR-SESSION] Deleting cookie: ${cookie.name}`);
		cookieStore.delete(cookie.name);
	}

	console.log("[AUTH CLEAR-SESSION] All cookies cleared, redirecting to home...");

	// Return an HTML page that clears client-side cookies and redirects to home
	// This ensures we clear cookies on both server and client side
	const html = `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="utf-8">
				<title>Redirecting...</title>
				<script>
					// Clear ALL client-side cookies as well
					console.log('[AUTH CLEAR-SESSION] Clearing client-side cookies...');
					const cookies = document.cookie.split(';');
					for (let i = 0; i < cookies.length; i++) {
						const cookie = cookies[i];
						const eqPos = cookie.indexOf('=');
						const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
						document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
						document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=' + window.location.hostname + ';';
						document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.' + window.location.hostname + ';';
					}
					console.log('[AUTH CLEAR-SESSION] Client-side cookies cleared, redirecting...');
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
