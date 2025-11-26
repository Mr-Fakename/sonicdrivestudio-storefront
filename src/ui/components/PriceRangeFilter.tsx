"use client";

import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface PriceRangeFilterProps {
	minPrice: number;
	maxPrice: number;
}

/**
 * Price range filter component with predefined price brackets
 * Uses URL search params to maintain filter state across page navigation.
 */
export function PriceRangeFilter({ minPrice, maxPrice }: PriceRangeFilterProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Get currently selected price range from URL
	const selectedRange = searchParams.get("price");

	const [isExpanded, setIsExpanded] = useState(!!selectedRange);

	// Define price ranges based on min/max
	const generatePriceRanges = () => {
		const ranges: { label: string; min: number; max: number; value: string }[] = [];

		// Round to nearest 10
		const roundedMin = Math.floor(minPrice / 10) * 10;
		const roundedMax = Math.ceil(maxPrice / 10) * 10;

		// Determine step size based on price range
		const diff = roundedMax - roundedMin;
		let step: number;

		if (diff <= 50) {
			step = 10;
		} else if (diff <= 100) {
			step = 20;
		} else if (diff <= 200) {
			step = 50;
		} else {
			step = 100;
		}

		// Generate ranges
		for (let i = roundedMin; i < roundedMax; i += step) {
			const rangeMin = i;
			const rangeMax = i + step;

			if (rangeMax <= roundedMax) {
				ranges.push({
					label: `$${rangeMin} - $${rangeMax}`,
					min: rangeMin,
					max: rangeMax,
					value: `${rangeMin}-${rangeMax}`,
				});
			}
		}

		return ranges;
	};

	const priceRanges = generatePriceRanges();

	const handleRangeChange = (value: string) => {
		const newParams = new URLSearchParams(searchParams.toString());

		if (selectedRange === value) {
			// Deselect if clicking the same range
			newParams.delete("price");
		} else {
			newParams.set("price", value);
		}

		router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
	};

	const clearFilter = () => {
		const newParams = new URLSearchParams(searchParams.toString());
		newParams.delete("price");
		router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
	};

	// Don't render if there's not enough price variation
	if (priceRanges.length <= 1) {
		return null;
	}

	return (
		<div className="mb-4 rounded border border-base-800 bg-base-900/50 p-3 backdrop-blur-sm">
			<div className="mb-2 flex items-center justify-between">
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="flex items-center gap-1.5 text-sm font-light text-white transition-colors hover:text-accent-400"
					aria-expanded={isExpanded}
					aria-controls="filter-price"
				>
					<span>Price Range</span>
					<svg
						className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				{selectedRange && (
					<button
						onClick={clearFilter}
						className="text-xs font-light text-accent-400 transition-colors hover:text-accent-300"
						aria-label="Clear price filter"
					>
						Clear
					</button>
				)}
			</div>

			{isExpanded && (
				<div id="filter-price" className="space-y-1">
					{priceRanges.map((range) => {
						const isSelected = selectedRange === range.value;
						const inputId = `filter-price-${range.value}`;

						return (
							<label
								key={range.value}
								htmlFor={inputId}
								className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 transition-colors hover:bg-base-800/50"
							>
								<input
									type="radio"
									id={inputId}
									name="price-range"
									checked={isSelected}
									onChange={() => handleRangeChange(range.value)}
									className="h-3.5 w-3.5 border-base-700 bg-base-800 text-accent-400 transition-colors focus:ring-2 focus:ring-accent-400 focus:ring-offset-0 focus:ring-offset-black"
								/>
								<span className="flex-1 text-xs font-light text-base-300">{range.label}</span>
							</label>
						);
					})}
				</div>
			)}
		</div>
	);
}
