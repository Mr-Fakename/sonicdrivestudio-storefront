"use client";

import { useSearchParams } from "next/navigation";
import { ProductList } from "./ProductList";
import { ProductFilter, type FilterOption } from "./ProductFilter";

// Type definitions for product with variants and attributes
interface AttributeValue {
	id: string;
	name: string;
}

interface Attribute {
	attribute: {
		id: string;
		name?: string | null;
		slug?: string | null;
	};
	values: AttributeValue[];
}

interface ProductVariant {
	id: string;
	name: string;
	attributes?: Attribute[] | null;
}

interface Product {
	id: string;
	name: string;
	slug: string;
	variants?: ProductVariant[] | null;
	[key: string]: unknown;
}

interface ProductListWithFilterProps {
	products: readonly Product[];
	attributeSlug?: string;
	filterTitle?: string;
}

/**
 * Extracts unique attribute values from products' variants
 */
function extractAttributeValues(
	products: readonly Product[],
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
	product: Product,
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

	// Get selected filters from URL
	const selectedFilters = searchParams.get(attributeSlug)?.split(",").filter(Boolean) || [];

	// Filter products based on selected values
	const filteredProducts =
		selectedFilters.length > 0
			? products.filter((product) =>
					selectedFilters.some((filterValue) =>
						productHasAttributeValue(product, attributeSlug, filterValue),
					),
			  )
			: products;

	return (
		<>
			{/* Filter UI */}
			{filterOptions.length > 0 && (
				<ProductFilter options={filterOptions} filterName={attributeSlug} title={filterTitle} />
			)}

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
