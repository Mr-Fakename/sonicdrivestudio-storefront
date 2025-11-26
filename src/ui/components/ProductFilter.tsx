"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

export interface FilterOption {
	value: string;
	label: string;
	count: number;
}

interface ProductFilterProps {
	options: FilterOption[];
	filterName: string;
	title: string;
}

/**
 * Dynamic product filter component that allows filtering by a specific attribute.
 * Uses URL search params to maintain filter state across page navigation.
 */
export function ProductFilter({ options, filterName, title }: ProductFilterProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Get currently selected filters from URL
	const selectedFilters = searchParams.get(filterName)?.split(",").filter(Boolean) || [];

	const handleFilterChange = (value: string, checked: boolean) => {
		const newParams = new URLSearchParams(searchParams.toString());
		let currentFilters = searchParams.get(filterName)?.split(",").filter(Boolean) || [];

		if (checked) {
			// Add filter
			if (!currentFilters.includes(value)) {
				currentFilters.push(value);
			}
		} else {
			// Remove filter
			currentFilters = currentFilters.filter((f) => f !== value);
		}

		if (currentFilters.length > 0) {
			newParams.set(filterName, currentFilters.join(","));
		} else {
			newParams.delete(filterName);
		}

		// Update URL
		router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
	};

	const clearFilters = () => {
		const newParams = new URLSearchParams(searchParams.toString());
		newParams.delete(filterName);
		router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
	};

	// Don't render if no options
	if (options.length === 0) {
		return null;
	}

	// Sort options alphabetically by label
	const sortedOptions = [...options].sort((a, b) => a.label.localeCompare(b.label));

	return (
		<div className="rounded border border-base-800 bg-base-900/50 p-3 backdrop-blur-sm">
			<div className="mb-2 flex items-center justify-between">
				<span className="text-sm font-light text-white">{title}</span>
				{selectedFilters.length > 0 && (
					<button
						onClick={clearFilters}
						className="text-xs font-light text-accent-400 transition-colors hover:text-accent-300"
						aria-label={`Clear ${title} filters`}
					>
						Clear ({selectedFilters.length})
					</button>
				)}
			</div>

			<div className="space-y-1">
				{sortedOptions.map((option) => {
					const isChecked = selectedFilters.includes(option.value);
					const inputId = `filter-${filterName}-${option.value}`;

					return (
						<label
							key={option.value}
							htmlFor={inputId}
							className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 transition-colors hover:bg-base-800/50"
						>
							<input
								type="checkbox"
								id={inputId}
								checked={isChecked}
								onChange={(e) => handleFilterChange(option.value, e.target.checked)}
								className="h-3.5 w-3.5 rounded border-base-700 bg-base-800 text-accent-400 transition-colors focus:ring-2 focus:ring-accent-400 focus:ring-offset-0 focus:ring-offset-black"
							/>
							<span className="flex-1 text-xs font-light text-base-300">{option.label}</span>
							<span className="text-xs text-base-500">({option.count})</span>
						</label>
					);
				})}
			</div>
		</div>
	);
}
