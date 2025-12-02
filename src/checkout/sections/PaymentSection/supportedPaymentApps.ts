import { LazyAdyenComponent } from "./AdyenDropIn/LazyAdyenComponent";
import { adyenGatewayId } from "./AdyenDropIn/types";
import { DummyComponent } from "./DummyDropIn/dummyComponent";
import { dummyGatewayId } from "./DummyDropIn/types";
import { LazyStripeComponent } from "./StripeElements/LazyStripeComponent";
import { stripeGatewayId } from "./StripeElements/types";

export const paymentMethodToComponent = {
	[adyenGatewayId]: LazyAdyenComponent,
	[stripeGatewayId]: LazyStripeComponent,
	[dummyGatewayId]: DummyComponent,
};
