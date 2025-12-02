import { useEffect, useMemo } from "react";
import { useCheckoutCustomerAttachMutation } from "@/checkout/graphql";
import { useSubmit } from "@/checkout/hooks/useSubmit/useSubmit";
import { useUser } from "@/checkout/hooks/useUser";
import { useCheckout } from "@/checkout/hooks/useCheckout";

export const useCustomerAttach = () => {
	const { checkout, fetching: fetchingCheckout } = useCheckout();
	const { authenticated } = useUser();

	const [{ fetching: fetchingCustomerAttach }, customerAttach] = useCheckoutCustomerAttachMutation();

	const onSubmit = useSubmit<{}, typeof customerAttach>(
		useMemo(
			() => ({
				hideAlerts: true,
				scope: "checkoutCustomerAttach",
				shouldAbort: () =>
					!!checkout?.user?.id || !authenticated || fetchingCustomerAttach || fetchingCheckout,
				onSubmit: customerAttach,
				parse: ({ languageCode, checkoutId }) => ({ languageCode, checkoutId }),
				// No error handler needed - if checkout is already attached, that's the desired state
			}),
			[authenticated, checkout?.user?.id, customerAttach, fetchingCheckout, fetchingCustomerAttach],
		),
	);

	useEffect(() => {
		void onSubmit();
	}, [onSubmit]);
};
