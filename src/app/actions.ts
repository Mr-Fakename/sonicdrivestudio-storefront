"use server";

import { getServerAuthClient } from "@/app/config";
import { cookies } from "next/headers";
import { DEFAULT_CHANNEL } from "@/app/config";

export async function logout() {
	"use server";
	(await getServerAuthClient()).signOut();
}

export async function clearInvalidAuthCookies() {
	"use server";
	try {
		const cookieStore = await cookies();

		// Get all cookies and delete them ALL (safe since important data is in localStorage)
		const allCookies = cookieStore.getAll();
		console.log(
			`[SERVER ACTION] Clearing ${allCookies.length} cookies:`,
			allCookies.map((c) => c.name).join(", "),
		);

		for (const cookie of allCookies) {
			try {
				cookieStore.delete({
					name: cookie.name,
					path: "/",
				});
				console.log(`[SERVER ACTION] Deleted cookie: ${cookie.name}`);
			} catch (e) {
				console.error(`[SERVER ACTION] Failed to delete cookie ${cookie.name}:`, e);
			}
		}

		console.log("[SERVER ACTION] All cookies cleared");
		return { success: true };
	} catch (error) {
		console.error("[SERVER ACTION] Failed to clear invalid cookies:", error);
		return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
	}
}
