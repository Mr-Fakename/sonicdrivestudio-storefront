"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

export type SortOption = {
	label: string;
	value: string;
};

interface ProductSortProps {
	options?: SortOption[];
}

const defaultSortOptions: SortOption[] = [
	{ label: "Recently Updated", value: "updated" },
	{ label: "Name (A-Z)", value: "name-asc" },
	{ label: "Name (Z-A)", value: "name-desc" },
	{ label: "Price (Low to High)", value: "price-asc" },
	{ label: "Price (High to Low)", value: "price-desc" },
];

/**
 * Product sorting dropdown component
 * Uses URL search params to maintain sort state across page navigation.
 */
export function ProductSort({ options = defaultSortOptions }: ProductSortProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const currentSort = searchParams.get("sort") || "updated";

	const handleSortChange = (value: string) => {
		const newParams = new URLSearchParams(searchParams.toString());

		if (value === "updated") {
			newParams.delete("sort");
		} else {
			newParams.set("sort", value);
		}

		router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
	};

	return (
		<div className="flex items-center gap-2">
			<label htmlFor="product-sort" className="text-xs font-light text-base-400">
				Sort by:
			</label>
			<select
				id="product-sort"
				value={currentSort}
				onChange={(e) => handleSortChange(e.target.value)}
				className="rounded border border-base-800 bg-base-900 px-3 py-1.5 text-xs font-light text-white transition-colors hover:border-base-700 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-0 focus:ring-offset-black"
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	);
}
