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
		cursor: string | string[] | undefined;
		after: string | string[] | undefined;
		page: string | string[] | undefined;
	}>;
}) {
	const searchParams = await props.searchParams;
	const cursor = typeof searchParams.cursor === "string" ? searchParams.cursor : null;
	const after = typeof searchParams.after === "string" ? searchParams.after : null;
	const pageParam = typeof searchParams.page === "string" ? parseInt(searchParams.page, 10) : 1;

	const { products } = await executeGraphQL(ProductListPaginatedDocument, {
		variables: {
			first: ProductsPerPage,
			after: after || cursor,
			channel: DEFAULT_CHANNEL,
			sortBy: ProductOrderField.LastModifiedAt,
			sortDirection: OrderDirection.Desc,
		},
		revalidate: 60,
	});

	if (!products) {
		notFound();
	}

	// Calculate current page based on total count and page size
	// Note: This is approximate since cursor-based pagination doesn't have exact pages
	const currentPage = pageParam || 1;

	const newSearchParams = new URLSearchParams({
		...(products.pageInfo.endCursor && { cursor: products.pageInfo.endCursor }),
	});

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
					urlSearchParams: newSearchParams,
					totalCount: products.totalCount ?? undefined,
					currentPage,
					pageSize: ProductsPerPage,
				}}
			/>
		</section>
	);
}
