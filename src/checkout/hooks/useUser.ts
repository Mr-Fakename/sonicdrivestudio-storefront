import { useUserQuery } from "@/checkout/graphql";

export const useUser = ({ pause = false } = {}) => {
	const [{ data, fetching: loading, stale }] = useUserQuery({
		pause,
		// Use cache-first to prevent re-fetching on every render
		// This is especially important since the user query can be slow (4.5s+)
		// when users have many addresses
		requestPolicy: "cache-first",
	});

	const user = data?.user;

	const authenticated = !!user?.id;

	return { user, loading: loading || stale, authenticated };
};
