import { type MetadataRoute } from "next";
import { executeGraphQL } from "@/lib/graphql";
import { ProductListDocument } from "@/gql/graphql";
import { DEFAULT_CHANNEL } from "@/app/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sonicdrivestudio.com";

	// Fetch all products for sitemap
	let allProducts: Array<{ slug: string; updatedAt?: string }> = [];

	try {
		const result = await executeGraphQL(ProductListDocument, {
			variables: {
				channel: DEFAULT_CHANNEL,
				first: 100,
			},
			withAuth: false,
			revalidate: 86400, // 24 hours
		});

		allProducts = result.products?.edges?.map((edge) => ({
			slug: edge.node.slug,
			updatedAt: edge.node.updatedAt,
		})) || [];
	} catch (error) {
		console.error("[SITEMAP] Error fetching products:", error);
	}

	// Static pages
	const staticPages: MetadataRoute.Sitemap = [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 1.0,
		},
		{
			url: `${baseUrl}/products`,
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 0.9,
		},
	];

	// Product pages
	const productPages: MetadataRoute.Sitemap = allProducts.map((product) => ({
		url: `${baseUrl}/products/${product.slug}`,
		lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
		changeFrequency: "weekly" as const,
		priority: 0.8,
	}));

	return [...staticPages, ...productPages];
}

// Enable ISR for sitemap
export const revalidate = 86400; // Regenerate sitemap every 24 hours
