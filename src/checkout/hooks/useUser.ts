import { useUserQuery } from "@/checkout/graphql";

export const useUser = ({ pause = false } = {}) => {
	const [{ data, fetching: loading, stale }] = useUserQuery({
		pause,
		// Use cache-and-network to ensure fresh data after login
		// This returns cached data immediately but always fetches in background
		// This is important for checkout - when users log in, we need fresh address data
		// The background fetch ensures forms populate with current user data
		requestPolicy: "cache-and-network",
	});

	const user = data?.user;

	const authenticated = !!user?.id;

	return { user, loading: loading || stale, authenticated };
};
