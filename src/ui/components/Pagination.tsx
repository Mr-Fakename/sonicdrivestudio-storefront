import clsx from "clsx";
import { LinkWithChannel } from "../atoms/LinkWithChannel";

export async function Pagination({
	pageInfo,
}: {
	pageInfo: {
		basePathname: string;
		startCursor?: string | null;
		endCursor?: string | null;
		hasNextPage: boolean;
		hasPreviousPage?: boolean;
		totalCount?: number;
		currentPage?: number;
		pageSize?: number;
		readonly urlSearchParams?: URLSearchParams;
	};
}) {
	// Calculate pagination info
	const totalPages = pageInfo.totalCount && pageInfo.pageSize
		? Math.ceil(pageInfo.totalCount / pageInfo.pageSize)
		: null;

	const currentPage = pageInfo.currentPage || 1;

	// Build URL for previous page
	const prevSearchParams = new URLSearchParams(pageInfo.urlSearchParams);
	if (pageInfo.startCursor) {
		prevSearchParams.set("before", pageInfo.startCursor);
		prevSearchParams.delete("after");
		prevSearchParams.delete("cursor");
	}

	// Build URL for next page
	const nextSearchParams = new URLSearchParams(pageInfo.urlSearchParams);
	if (pageInfo.endCursor) {
		nextSearchParams.set("cursor", pageInfo.endCursor);
		nextSearchParams.set("after", pageInfo.endCursor);
		nextSearchParams.delete("before");
	}

	return (
		<nav className="flex items-center justify-center gap-x-6 px-4 pt-12">
			{/* Previous button */}
			<LinkWithChannel
				href={pageInfo.hasPreviousPage ? `${pageInfo.basePathname}?${prevSearchParams.toString()}` : "#"}
				className={clsx("text-sm font-medium tracking-wide", {
					"btn-primary": pageInfo.hasPreviousPage,
					"btn-ghost cursor-not-allowed opacity-50": !pageInfo.hasPreviousPage,
					"pointer-events-none": !pageInfo.hasPreviousPage,
				})}
				aria-disabled={!pageInfo.hasPreviousPage}
			>
				← Previous
			</LinkWithChannel>

			{/* Page indicator */}
			<div className="flex items-center gap-x-2 text-sm text-base-600">
				{totalPages ? (
					<span>
						Page <span className="font-semibold text-base-900">{currentPage}</span> of{" "}
						<span className="font-semibold text-base-900">{totalPages}</span>
					</span>
				) : pageInfo.totalCount ? (
					<span>
						<span className="font-semibold text-base-900">{pageInfo.totalCount}</span> total items
					</span>
				) : null}
			</div>

			{/* Next button */}
			<LinkWithChannel
				href={pageInfo.hasNextPage ? `${pageInfo.basePathname}?${nextSearchParams.toString()}` : "#"}
				className={clsx("text-sm font-medium tracking-wide", {
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
