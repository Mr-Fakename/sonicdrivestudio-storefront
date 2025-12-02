"use client";
import { ErrorBoundary } from "react-error-boundary";
import {
	type Client,
	Provider as UrqlProvider,
	cacheExchange,
	createClient,
	dedupExchange,
	fetchExchange,
} from "urql";

import { ToastContainer } from "react-toastify";
import { useSaleorAuthContext } from "@saleor/auth-sdk/react";
import { useState } from "react";
import { alertsContainerProps } from "./hooks/useAlerts/consts";
import { RootViews } from "./views/RootViews";
import { PageNotFound } from "@/checkout/views/PageNotFound";
import { authErrorExchange } from "@/lib/urqlAuthErrorExchange";
import { errorFilterExchange } from "./lib/errorFilterExchange";
import "./index.css";

export const Root = ({ saleorApiUrl }: { saleorApiUrl: string }) => {
	const saleorAuthClient = useSaleorAuthContext();

	const makeUrqlClient = () => {
		const isServer = typeof window === "undefined";

		return createClient({
			url: saleorApiUrl,
			suspense: !isServer, // Disable suspense on server to prevent SSR errors
			requestPolicy: isServer ? "network-only" : "cache-first", // Use cache-first on client to prevent infinite query loops
			fetch: (input, init) => saleorAuthClient.fetchWithAuth(input as NodeJS.fetch.RequestInfo, init),
			exchanges: [dedupExchange, cacheExchange, authErrorExchange, errorFilterExchange, fetchExchange],
		});
	};

	// Create URQL client once and reuse it.
	// We don't need to recreate on token refresh - fetchWithAuth handles token updates automatically.
	// This prevents the infinite loop where token refresh → client recreation → query re-execution → token refresh.
	const [urqlClient] = useState<Client>(makeUrqlClient());

	return (
		<UrqlProvider value={urqlClient}>
			<ToastContainer {...alertsContainerProps} />
			<ErrorBoundary FallbackComponent={PageNotFound}>
				<RootViews />
			</ErrorBoundary>
		</UrqlProvider>
	);
};
