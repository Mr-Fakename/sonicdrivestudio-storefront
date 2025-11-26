"use client";

import { useSearchParams } from "next/navigation";
import { ProductList } from "./ProductList";
import { ProductFilter, type FilterOption } from "./ProductFilter";
import { PriceRangeFilter } from "./PriceRangeFilter";
import type { ProductListItemFragment } from "@/gql/graphql";

interface ProductListWithFilterProps {
	products: readonly ProductListItemFragment[];
	attributeSlug?: string;
	filterTitle?: string;
}

/**
 * Extracts unique attribute values from products' variants
 */
function extractAttributeValues(
	products: readonly ProductListItemFragment[],
	attributeSlug: string,
): FilterOption[] {
	const valueCounts = new Map<string, { label: string; count: number }>();

	products.forEach((product) => {
		if (!product.variants) return;

		// Track if this product has been counted for a value (to avoid double-counting)
		const countedForProduct = new Set<string>();

		product.variants.forEach((variant) => {
			if (!variant.attributes) return;

			variant.attributes.forEach((attr) => {
				if (attr.attribute.slug && attr.attribute.slug === attributeSlug) {
					attr.values.forEach((value) => {
						if (!value.name) return;
						const key = value.name;
						if (!countedForProduct.has(key)) {
							const existing = valueCounts.get(key);
							if (existing) {
								existing.count += 1;
							} else {
								valueCounts.set(key, { label: value.name, count: 1 });
							}
							countedForProduct.add(key);
						}
					});
				}
			});
		});
	});

	return Array.from(valueCounts.entries()).map(([value, { label, count }]) => ({
		value,
		label,
		count,
	}));
}

/**
 * Checks if a product has a variant with the specified attribute value
 */
function productHasAttributeValue(
	product: ProductListItemFragment,
	attributeSlug: string,
	targetValue: string,
): boolean {
	if (!product.variants) return false;

	return product.variants.some((variant) => {
		if (!variant.attributes) return false;

		return variant.attributes.some((attr) => {
			if (!attr.attribute.slug || attr.attribute.slug !== attributeSlug) return false;
			return attr.values.some((value) => value.name === targetValue);
		});
	});
}

/**
 * Gets the price of a product (uses the start price from the price range)
 */
function getProductPrice(product: ProductListItemFragment): number {
	return product.pricing?.priceRange?.start?.gross?.amount ?? 0;
}

/**
 * Extracts min and max prices from products
 */
function getPriceRange(products: readonly ProductListItemFragment[]): { min: number; max: number } {
	if (products.length === 0) return { min: 0, max: 0 };

	let min = Infinity;
	let max = -Infinity;

	products.forEach((product) => {
		const price = getProductPrice(product);
		if (price > 0) {
			min = Math.min(min, price);
			max = Math.max(max, price);
		}
	});

	return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max };
}

/**
 * Checks if a product's price falls within the specified range
 */
function productInPriceRange(product: ProductListItemFragment, min: number, max: number): boolean {
	const price = getProductPrice(product);
	return price >= min && price <= max;
}

/**
 * Component that displays products with a dynamic filter based on variant attributes.
 * Filters are applied client-side and state is maintained in URL search params.
 */
export function ProductListWithFilter({
	products,
	attributeSlug = "platform",
	filterTitle = "Platform",
}: ProductListWithFilterProps) {
	const searchParams = useSearchParams();

	// Extract unique attribute values for filter options
	const filterOptions = extractAttributeValues(products, attributeSlug);

	// Get price range from all products
	const priceRange = getPriceRange(products);

	// Get selected filters from URL
	const selectedFilters = searchParams.get(attributeSlug)?.split(",").filter(Boolean) || [];
	const selectedPriceRange = searchParams.get("price");

	// Parse price range
	let priceMin = 0;
	let priceMax = Infinity;
	if (selectedPriceRange) {
		const [min, max] = selectedPriceRange.split("-").map(Number);
		if (!isNaN(min) && !isNaN(max)) {
			priceMin = min;
			priceMax = max;
		}
	}

	// Filter products based on selected values and price
	let filteredProducts = products;

	// Apply attribute filter
	if (selectedFilters.length > 0) {
		filteredProducts = filteredProducts.filter((product) =>
			selectedFilters.some((filterValue) => productHasAttributeValue(product, attributeSlug, filterValue)),
		);
	}

	// Apply price filter
	if (selectedPriceRange) {
		filteredProducts = filteredProducts.filter((product) => productInPriceRange(product, priceMin, priceMax));
	}

	return (
		<>
			{/* Filter UI */}
			<div className="mb-6 flex flex-wrap gap-3">
				{filterOptions.length > 0 && (
					<div className="w-full sm:w-auto sm:min-w-[200px]">
						<ProductFilter options={filterOptions} filterName={attributeSlug} title={filterTitle} />
					</div>
				)}
				{priceRange.max > priceRange.min && (
					<div className="w-full sm:w-auto sm:min-w-[200px]">
						<PriceRangeFilter minPrice={priceRange.min} maxPrice={priceRange.max} />
					</div>
				)}
			</div>

			{/* Product List */}
			{filteredProducts.length > 0 ? (
				<ProductList products={filteredProducts} />
			) : (
				<div className="flex min-h-[200px] items-center justify-center rounded-lg border border-base-800 bg-base-900/50 p-8 text-center">
					<div>
						<p className="text-lg text-base-300">No products match the selected filters.</p>
						<p className="mt-2 text-sm text-base-500">Try adjusting your filter selection.</p>
					</div>
				</div>
			)}
		</>
	);
}
