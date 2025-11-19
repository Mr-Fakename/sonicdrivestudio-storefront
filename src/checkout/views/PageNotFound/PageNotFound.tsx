import { type FallbackProps } from "react-error-boundary";
import { SaleorLogo } from "@/checkout/assets/images/SaleorLogo";
import { Button } from "@/checkout/components/Button";
import { ErrorContentWrapper } from "@/checkout/components/ErrorContentWrapper";
import { saleorAuthClient } from "@/ui/components/AuthProvider";

export const PageNotFound = ({ error }: Partial<FallbackProps>) => {
	console.error(error);

	const goBack = () => {
		// Properly sign out to clear auth state before going back
		void saleorAuthClient.signOut();

		// eslint-disable-next-line no-restricted-globals
		history.back();
	};

	return (
		<ErrorContentWrapper>
			<div className="mb-4 flex w-28 flex-col">
				<SaleorLogo />
			</div>
			<p>We couldn&apos;t fetch information about your checkout. Go back to the store and try again.</p>
			<Button ariaLabel="Go back to store" onClick={goBack} variant="secondary" label="Go back to store" />
		</ErrorContentWrapper>
	);
};
