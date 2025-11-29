/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import AdyenCheckout from "@adyen/adyen-web";
import { type CardElementData } from "@adyen/adyen-web/dist/types/components/Card/types";
import type DropinElement from "@adyen/adyen-web/dist/types/components/Dropin";
import { PaymentResponse as AdyenApiPaymentResponse } from "@adyen/api-library/lib/src/typings/checkout/paymentResponse";
import { type CreateCheckoutSessionResponse } from "@adyen/api-library/lib/src/typings/checkout/createCheckoutSessionResponse";
import { type AdyenPaymentResponse } from "./types";
import { replaceUrl } from "@/checkout/lib/utils/url";

export type AdyenDropInCreateSessionResponse = {
	session: CreateCheckoutSessionResponse;
	clientKey?: string;
};
export type PostAdyenDropInPaymentsDetailsResponse = {
	payment: AdyenPaymentResponse;
	orderId: string;
};
export type PostAdyenDropInPaymentsResponse = {
	payment: AdyenPaymentResponse;
	orderId: string;
};

export type AdyenCheckoutInstanceState = {
	isValid?: boolean;
	data: CardElementData & Record<string, any>;
};
export type AdyenCheckoutInstanceOnSubmit = (
	state: AdyenCheckoutInstanceState,
	component: DropinElement,
) => Promise<void> | void;

export type AdyenCheckoutInstanceOnAdditionalDetails = (
	state: AdyenCheckoutInstanceState,
	component: DropinElement,
) => Promise<void> | void;

type ApplePayCallback = <T>(value: T) => void;

export function createAdyenCheckoutInstance(
	adyenSessionResponse: AdyenDropInCreateSessionResponse,
	{
		onSubmit,
		onAdditionalDetails,
	}: {
		onSubmit: AdyenCheckoutInstanceOnSubmit;
		onAdditionalDetails: AdyenCheckoutInstanceOnAdditionalDetails;
	},
) {
	const adyenEnvironment = (process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT || "test") as "test" | "live";

	return AdyenCheckout({
		locale: "en-US",
		environment: adyenEnvironment,
		clientKey: adyenSessionResponse.clientKey,
		session: {
			id: adyenSessionResponse.session.id,
			sessionData: adyenSessionResponse.session.sessionData,
		},
		onPaymentCompleted: (result: any, component: any) => {
			console.info(result, component);
		},
		onError: (error: any, component: any) => {
			console.error(error.name, error.message, error.stack, component);
		},
		onSubmit,
		onAdditionalDetails,
		// Any payment method specific configuration. Find the configuration specific to each payment method: https://docs.adyen.com/payment-methods
		// For example, this is 3D Secure configuration for cards:
		paymentMethodsConfiguration: {
			card: {
				hasHolderName: true,
				holderNameRequired: true,
				billingAddressRequired: false,
			},
			applepay: {
				buttonType: "plain",
				buttonColor: "black",
				onPaymentMethodSelected: (resolve: ApplePayCallback, _reject: ApplePayCallback, event) => {
					resolve(event.paymentMethod);
				},
				onShippingContactSelected: (resolve: ApplePayCallback, _reject: ApplePayCallback, event) => {
					resolve(event.shippingContact);
				},
				onShippingMethodSelected: (resolve: ApplePayCallback, _reject: ApplePayCallback, event) => {
					resolve(event.shippingMethod);
				},
			},
		},
		analytics: {
			enabled: false,
		},
	});
}

export function handlePaymentResult(
	saleorApiUrl: string,
	result: PostAdyenDropInPaymentsResponse | PostAdyenDropInPaymentsDetailsResponse,
	component: DropinElement,
) {
	const resultCode = result.payment.resultCode;

	switch (resultCode) {
		// Successful payment statuses
		case AdyenApiPaymentResponse.ResultCodeEnum.Authorised:
		case AdyenApiPaymentResponse.ResultCodeEnum.Success: {
			component.setStatus("success");
			const domain = new URL(saleorApiUrl).hostname;
			const newUrl = replaceUrl({
				query: {
					checkout: undefined,
					order: result.orderId,
					saleorApiUrl,
					domain,
				},
			});
			window.location.href = newUrl;
			return;
		}

		// Pending/In-progress statuses - allow Adyen to handle
		case AdyenApiPaymentResponse.ResultCodeEnum.ChallengeShopper:
		case AdyenApiPaymentResponse.ResultCodeEnum.IdentifyShopper:
		case AdyenApiPaymentResponse.ResultCodeEnum.RedirectShopper:
		case AdyenApiPaymentResponse.ResultCodeEnum.PresentToShopper:
		case AdyenApiPaymentResponse.ResultCodeEnum.Pending:
		case AdyenApiPaymentResponse.ResultCodeEnum.Received: {
			// These statuses require additional action from the shopper
			// Adyen SDK will handle the UI for these cases
			component.setStatus("loading");
			return;
		}

		// User cancelled
		case AdyenApiPaymentResponse.ResultCodeEnum.Cancelled: {
			component.setStatus("ready");
			return;
		}

		// Authentication finished but payment not yet complete
		case AdyenApiPaymentResponse.ResultCodeEnum.AuthenticationFinished: {
			component.setStatus("loading");
			return;
		}

		// Error cases
		case AdyenApiPaymentResponse.ResultCodeEnum.Error:
		case AdyenApiPaymentResponse.ResultCodeEnum.Refused:
		default: {
			const errorMessage =
				result.payment.refusalReason ||
				(resultCode === AdyenApiPaymentResponse.ResultCodeEnum.Refused
					? "Payment was refused. Please try a different payment method."
					: "An error occurred processing your payment. Please try again.");

			component.setStatus("error", {
				message: errorMessage,
			});
			return;
		}
	}
}
