import { useEffect, useRef } from "react";
import { useCheckoutCustomerAttachMutation } from "@/checkout/graphql";
import { useUser } from "@/checkout/hooks/useUser";
import { useCheckout } from "@/checkout/hooks/useCheckout";

export const useCustomerAttach = () => {
	const { checkout } = useCheckout();
	const { authenticated, user } = useUser();
	const [{ fetching }, customerAttach] = useCheckoutCustomerAttachMutation();

	// Track if we've attempted attachment for this checkout+user combination
	const attemptedRef = useRef<string | null>(null);
	const currentKey = `${checkout?.id}-${user?.id}`;

	useEffect(() => {
		// Skip if already attempted for this checkout+user combo
		if (attemptedRef.current === currentKey) {
			return;
		}

		// Skip if conditions aren't met
		if (!checkout?.id || !authenticated || !user?.id || fetching) {
			return;
		}

		// Skip if checkout is already attached to this user
		if (checkout.user?.id === user.id) {
			attemptedRef.current = currentKey;
			return;
		}

		// Skip if checkout is attached to a different user (don't try to reassign)
		if (checkout.user?.id && checkout.user.id !== user.id) {
			attemptedRef.current = currentKey;
			return;
		}

		// Attempt to attach customer
		attemptedRef.current = currentKey;
		void customerAttach({
			checkoutId: checkout.id,
			languageCode: "EN_US",
		});
	}, [checkout?.id, checkout?.user?.id, user?.id, authenticated, fetching, customerAttach, currentKey]);
};
