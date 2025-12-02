import { type MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sonicdrivestudio.com";

	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/api/", "/checkout/", "/account/", "/_next/", "/admin/"],
			},
			{
				userAgent: "Googlebot",
				allow: "/",
				disallow: ["/api/", "/checkout/", "/account/", "/_next/", "/admin/"],
			},
			{
				userAgent: "bingbot",
				allow: "/",
				disallow: ["/api/", "/checkout/", "/account/", "/_next/", "/admin/"],
				crawlDelay: 1,
			},
		],
		sitemap: `${baseUrl}/sitemap.xml`,
	};
}
