import clsx from "clsx";
import { LinkWithChannel } from "../atoms/LinkWithChannel";

export async function Pagination({
	pageInfo,
}: {
	pageInfo: {
		basePathname: string;
		endCursor?: string | null;
		hasNextPage: boolean;
		hasPreviousPage?: boolean;
		totalCount?: number;
		currentPage: number;
		pageSize?: number;
		prevCursor?: string | null;
		readonly urlSearchParams?: URLSearchParams;
	};
}) {
	// Calculate pagination info
	const totalPages =
		pageInfo.totalCount && pageInfo.pageSize
			? Math.ceil(pageInfo.totalCount / pageInfo.pageSize)
			: null;

	const currentPage = pageInfo.currentPage;

	// Build URL for previous page (decrement page number, use previous cursor)
	const prevSearchParams = new URLSearchParams();
	// Copy search/query params but not cursor params
	pageInfo.urlSearchParams?.forEach((value, key) => {
		if (key !== "cursor" && key !== "page" && key !== "prevCursor") {
			prevSearchParams.set(key, value);
		}
	});

	if (pageInfo.hasPreviousPage && currentPage > 1) {
		prevSearchParams.set("page", String(currentPage - 1));
		if (pageInfo.prevCursor) {
			prevSearchParams.set("cursor", pageInfo.prevCursor);
		}
	}

	// Build URL for next page (increment page number, use end cursor)
	const nextSearchParams = new URLSearchParams();
	// Copy search/query params but not cursor params
	pageInfo.urlSearchParams?.forEach((value, key) => {
		if (key !== "cursor" && key !== "page" && key !== "prevCursor") {
			nextSearchParams.set(key, value);
		}
	});

	if (pageInfo.hasNextPage && pageInfo.endCursor) {
		nextSearchParams.set("cursor", pageInfo.endCursor);
		nextSearchParams.set("page", String(currentPage + 1));
		// Store current cursor as previous for back navigation
		const currentCursor = pageInfo.urlSearchParams?.get("cursor");
		if (currentCursor) {
			nextSearchParams.set("prevCursor", currentCursor);
		}
	}

	const hasPrev = pageInfo.hasPreviousPage && currentPage > 1;

	return (
		<nav className="flex flex-col items-center justify-center gap-4 px-4 pt-8 sm:flex-row sm:gap-6 sm:pt-12">
			{/* Previous button */}
			<LinkWithChannel
				href={hasPrev ? `${pageInfo.basePathname}?${prevSearchParams.toString()}` : "#"}
				className={clsx("w-full text-center text-sm font-medium tracking-wide sm:w-auto", {
					"btn-primary": hasPrev,
					"btn-ghost cursor-not-allowed opacity-50": !hasPrev,
					"pointer-events-none": !hasPrev,
				})}
				aria-disabled={!hasPrev}
			>
				<span className="hidden sm:inline">← Previous</span>
				<span className="sm:hidden">← Prev</span>
			</LinkWithChannel>

			{/* Page indicator */}
			<div className="flex items-center gap-x-2 text-sm text-base-600">
				{totalPages ? (
					<span className="whitespace-nowrap">
						Page <span className="font-semibold text-base-900">{currentPage}</span> of{" "}
						<span className="font-semibold text-base-900">{totalPages}</span>
					</span>
				) : pageInfo.totalCount ? (
					<span className="whitespace-nowrap">
						<span className="font-semibold text-base-900">{pageInfo.totalCount}</span> total items
					</span>
				) : null}
			</div>

			{/* Next button */}
			<LinkWithChannel
				href={pageInfo.hasNextPage ? `${pageInfo.basePathname}?${nextSearchParams.toString()}` : "#"}
				className={clsx("w-full text-center text-sm font-medium tracking-wide sm:w-auto", {
					"btn-primary": pageInfo.hasNextPage,
					"btn-ghost cursor-not-allowed opacity-50": !pageInfo.hasNextPage,
					"pointer-events-none": !pageInfo.hasNextPage,
				})}
				aria-disabled={!pageInfo.hasNextPage}
			>
				Next →
			</LinkWithChannel>
		</nav>
	);
}
