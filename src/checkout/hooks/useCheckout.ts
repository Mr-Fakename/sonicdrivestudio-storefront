import { useEffect, useMemo } from "react";

import { type Checkout, useCheckoutQuery } from "@/checkout/graphql";
import { extractCheckoutIdFromUrl } from "@/checkout/lib/utils/url";
import { useCheckoutUpdateStateActions } from "@/checkout/state/updateStateStore";

export const useCheckout = ({ pause = false } = {}) => {
	const id = useMemo(() => {
		try {
			return extractCheckoutIdFromUrl();
		} catch {
			// If extractCheckoutIdFromUrl throws an error (e.g., no checkout token),
			// return empty string to pause the query
			return "";
		}
	}, []);
	const { setLoadingCheckout } = useCheckoutUpdateStateActions();

	// Automatically pause the query if:
	// 1. Explicitly paused via parameter
	// 2. No checkout ID available (empty string)
	// 3. extractCheckoutIdFromUrl() failed
	const shouldPause = pause || !id || id === "";

	const [{ data, fetching, stale }, refetch] = useCheckoutQuery({
		variables: { id, languageCode: "EN_US" },
		pause: shouldPause,
	});

	useEffect(() => setLoadingCheckout(fetching || stale), [fetching, setLoadingCheckout, stale]);

	return useMemo(
		() => ({ checkout: data?.checkout as Checkout, fetching: fetching || stale, refetch }),
		[data?.checkout, fetching, stale, refetch],
	);
};
