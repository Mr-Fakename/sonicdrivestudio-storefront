import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Route handler to clear ALL cookies when JWT signature expires
 * This is a Route Handler (not a Server Component) so it can modify cookies
 */
export async function GET() {
	console.warn("[AUTH CLEAR-SESSION] Clearing expired session - deleting ALL cookies...");

	const cookieStore = await cookies();

	// Get all cookies and delete them with proper options
	const allCookies = cookieStore.getAll();
	console.log(
		`[AUTH CLEAR-SESSION] Found ${allCookies.length} cookies to clear:`,
		allCookies.map((c) => c.name).join(", "),
	);

	// Delete ALL cookies with all possible combinations of options
	// This ensures cookies are deleted regardless of how they were set
	for (const cookie of allCookies) {
		console.log(`[AUTH CLEAR-SESSION] Deleting cookie: ${cookie.name}`);

		// Try deleting with various option combinations to ensure it works
		// regardless of how the cookie was originally set
		try {
			cookieStore.delete({
				name: cookie.name,
				path: "/",
			});
		} catch (e) {
			console.error(`[AUTH CLEAR-SESSION] Failed to delete cookie ${cookie.name}:`, e);
		}
	}

	console.log("[AUTH CLEAR-SESSION] Server-side cookies cleared, returning response with client-side cleanup...");

	// Return an HTML page that clears client-side cookies and redirects to home
	// This is a double-layer approach: server-side + client-side clearing
	const html = `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="utf-8">
				<title>Redirecting...</title>
				<script>
					// Clear ALL client-side cookies as well (belt and suspenders approach)
					console.log('[AUTH CLEAR-SESSION] Clearing client-side cookies...');
					const cookies = document.cookie.split(';');

					for (let i = 0; i < cookies.length; i++) {
						const cookie = cookies[i];
						const eqPos = cookie.indexOf('=');
						const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();

						if (name) {
							// Try all possible combinations to ensure deletion
							const expiry = 'expires=Thu, 01 Jan 1970 00:00:00 UTC';
							const variations = [
								name + '=;' + expiry + ';path=/;',
								name + '=;' + expiry + ';path=/;domain=' + window.location.hostname + ';',
								name + '=;' + expiry + ';path=/;domain=.' + window.location.hostname + ';',
								name + '=;' + expiry + ';path=/;SameSite=Lax;',
								name + '=;' + expiry + ';path=/;SameSite=Strict;',
								name + '=;' + expiry + ';path=/;SameSite=None;Secure;',
							];

							variations.forEach(function(variant) {
								document.cookie = variant;
							});
						}
					}

					console.log('[AUTH CLEAR-SESSION] Client-side cookies cleared. Remaining:', document.cookie);
					console.log('[AUTH CLEAR-SESSION] Redirecting to home page...');

					// Small delay to ensure cookies are cleared before redirect
					setTimeout(function() {
						window.location.href = '/';
					}, 100);
				</script>
			</head>
			<body style="margin:0;padding:0;background:#000;"></body>
		</html>
	`;

	return new NextResponse(html, {
		status: 200,
		headers: {
			"Content-Type": "text/html",
			// Ensure no caching of this response
			"Cache-Control": "no-store, no-cache, must-revalidate, private",
			"Pragma": "no-cache",
			"Expires": "0",
		},
	});
}
