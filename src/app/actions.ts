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
		const authClient = await getServerAuthClient();

		// Clear auth cookies using the SDK
		await authClient.signOut();

		// Also clear checkout cookie if it might be corrupted
		const checkoutCookieName = `checkoutId-${DEFAULT_CHANNEL}`;
		if (cookieStore.has(checkoutCookieName)) {
			cookieStore.delete(checkoutCookieName);
		}

		return { success: true };
	} catch (error) {
		console.error("Failed to clear invalid cookies:", error);
		return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
	}
}
