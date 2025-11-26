import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductListPaginatedDocument, ProductOrderField, OrderDirection } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";
import { Pagination } from "@/ui/components/Pagination";
import { ProductListWithFilter } from "@/ui/components/ProductListWithFilter";
import { ProductListSkeleton } from "@/ui/atoms/SkeletonLoader";
import { ProductsPerPage, DEFAULT_CHANNEL } from "@/app/config";
import { SITE_CONFIG } from "@/lib/constants";

export const metadata = {
	title: "All Products",
	description: `Browse all ${SITE_CONFIG.name} products. ${SITE_CONFIG.description}`,
};

export default async function Page(props: {
	searchParams: Promise<{
		cursor?: string | string[];
		page?: string | string[];
		prevCursor?: string | string[];
	}>;
}) {
	const searchParams = await props.searchParams;
	const cursor = typeof searchParams.cursor === "string" ? searchParams.cursor : null;
	const prevCursor = typeof searchParams.prevCursor === "string" ? searchParams.prevCursor : null;
	const pageParam = typeof searchParams.page === "string" ? parseInt(searchParams.page, 10) : 1;

	const { products } = await executeGraphQL(ProductListPaginatedDocument, {
		variables: {
			first: ProductsPerPage,
			after: cursor,
			channel: DEFAULT_CHANNEL,
			sortBy: ProductOrderField.LastModifiedAt,
			sortDirection: OrderDirection.Desc,
		},
		revalidate: 60,
	});

	if (!products) {
		notFound();
	}

	const currentPage = pageParam;

	// Build search params to pass to pagination
	const paginationSearchParams = new URLSearchParams();
	if (cursor) {
		paginationSearchParams.set("cursor", cursor);
	}
	if (prevCursor) {
		paginationSearchParams.set("prevCursor", prevCursor);
	}
	if (pageParam > 1) {
		paginationSearchParams.set("page", String(pageParam));
	}

	return (
		<section className="mx-auto max-w-7xl p-8 pb-16">
			<h1 className="pb-8 text-xl font-semibold">All Products</h1>
			<Suspense fallback={<ProductListSkeleton />}>
				<ProductListWithFilter products={products.edges.map((e) => e.node)} />
			</Suspense>
			<Pagination
				pageInfo={{
					...products.pageInfo,
					basePathname: `/products`,
					urlSearchParams: paginationSearchParams,
					totalCount: products.totalCount ?? undefined,
					currentPage,
					pageSize: ProductsPerPage,
					prevCursor,
				}}
			/>
		</section>
	);
}
