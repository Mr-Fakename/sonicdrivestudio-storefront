import { notFound, redirect } from "next/navigation";
import { OrderDirection, ProductOrderField, SearchProductsDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";
import { Pagination } from "@/ui/components/Pagination";
import { ProductList } from "@/ui/components/ProductList";
import { ProductsPerPage, DEFAULT_CHANNEL } from "@/app/config";
import { SITE_CONFIG } from "@/lib/constants";

export const metadata = {
	title: "Search Products",
	description: `Search ${SITE_CONFIG.name} products. Find high-quality cab impulse responses, amp captures, and guitar tones for your perfect sound.`,
};

export default async function Page(props: {
	searchParams: Promise<{
		query?: string | string[];
		cursor?: string | string[];
		page?: string | string[];
		prevCursor?: string | string[];
	}>;
}) {
	const searchParams = await props.searchParams;
	const cursor = typeof searchParams.cursor === "string" ? searchParams.cursor : null;
	const prevCursor = typeof searchParams.prevCursor === "string" ? searchParams.prevCursor : null;
	const pageParam = typeof searchParams.page === "string" ? parseInt(searchParams.page, 10) : 1;
	const searchValue = searchParams.query;

	if (!searchValue) {
		notFound();
	}

	if (Array.isArray(searchValue)) {
		const firstValidSearchValue = searchValue.find((v) => v.length > 0);
		if (!firstValidSearchValue) {
			notFound();
		}
		redirect(`/search?${new URLSearchParams({ query: firstValidSearchValue }).toString()}`);
	}

	const { products } = await executeGraphQL(SearchProductsDocument, {
		variables: {
			first: ProductsPerPage,
			search: searchValue,
			after: cursor,
			sortBy: ProductOrderField.Rating,
			sortDirection: OrderDirection.Asc,
			channel: DEFAULT_CHANNEL,
		},
		revalidate: 60,
	});

	if (!products) {
		notFound();
	}

	const currentPage = pageParam;

	// Build search params to pass to pagination
	const paginationSearchParams = new URLSearchParams();
	paginationSearchParams.set("query", searchValue);
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
			{products.totalCount && products.totalCount > 0 ? (
				<div>
					<h1 className="pb-8 text-xl font-semibold">Search results for &quot;{searchValue}&quot;:</h1>
					<ProductList products={products.edges.map((e) => e.node)} />
					<Pagination
						pageInfo={{
							...products.pageInfo,
							basePathname: `/search`,
							urlSearchParams: paginationSearchParams,
							totalCount: products.totalCount ?? undefined,
							currentPage,
							pageSize: ProductsPerPage,
							prevCursor,
						}}
					/>
				</div>
			) : (
				<h1 className="mx-auto pb-8 text-center text-xl font-semibold">Nothing found :(</h1>
			)}
		</section>
	);
}
