/**
 * Structured Data Utilities
 *
 * Generate JSON-LD structured data for SEO.
 * Supports: Organization, Website, BreadcrumbList, Product, Offer
 */

import type { WithContext, Organization, WebSite, BreadcrumbList, Product, Offer } from 'schema-dts';

/**
 * Generate Organization structured data
 */
export function generateOrganizationSchema(): WithContext<Organization> {
	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sonicdrivestudio.com';

	return {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'Sonic Drive Studio',
		url: siteUrl,
		logo: `${siteUrl}/logo.png`,
		description: 'Professional guitar tones, cab impulse responses, and amp captures for musicians.',
		sameAs: [
			// Add social media links here
			// 'https://facebook.com/yourpage',
			// 'https://twitter.com/yourhandle',
			// 'https://instagram.com/yourhandle',
		],
		contactPoint: {
			'@type': 'ContactPoint',
			contactType: 'customer service',
			availableLanguage: ['en'],
		},
	};
}

/**
 * Generate Website structured data
 */
export function generateWebsiteSchema(): WithContext<WebSite> {
	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sonicdrivestudio.com';

	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'Sonic Drive Studio',
		url: siteUrl,
		description: 'High-quality guitar tones, impulse responses, and amp captures.',
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${siteUrl}/products?search={search_term_string}`,
			},
			'query-input': 'required name=search_term_string',
		},
	};
}

/**
 * Generate BreadcrumbList structured data
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>): WithContext<BreadcrumbList> {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: item.url,
		})),
	};
}

/**
 * Generate Product structured data
 */
export function generateProductSchema(product: {
	name: string;
	description?: string;
	image?: string;
	sku?: string;
	brand?: string;
	price?: number;
	currency?: string;
	availability: 'InStock' | 'OutOfStock' | 'PreOrder';
	url: string;
}): WithContext<Product> {
	const offer: Offer = {
		'@type': 'Offer',
		url: product.url,
		priceCurrency: product.currency || 'USD',
		price: product.price,
		availability: `https://schema.org/${product.availability}`,
		seller: {
			'@type': 'Organization',
			name: 'Sonic Drive Studio',
		},
	};

	return {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: product.name,
		description: product.description,
		image: product.image,
		sku: product.sku,
		brand: {
			'@type': 'Brand',
			name: product.brand || 'Sonic Drive Studio',
		},
		offers: offer,
	};
}

/**
 * Generate AggregateOffer for products with variants
 */
export function generateAggregateOfferSchema(product: {
	name: string;
	description?: string;
	image?: string;
	lowPrice: number;
	highPrice: number;
	currency: string;
	availability: 'InStock' | 'OutOfStock';
	url: string;
}): WithContext<Product> {
	return {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: product.name,
		description: product.description,
		image: product.image,
		offers: {
			'@type': 'AggregateOffer',
			url: product.url,
			priceCurrency: product.currency,
			lowPrice: product.lowPrice,
			highPrice: product.highPrice,
			availability: `https://schema.org/${product.availability}`,
			seller: {
				'@type': 'Organization',
				name: 'Sonic Drive Studio',
			},
		},
	};
}

