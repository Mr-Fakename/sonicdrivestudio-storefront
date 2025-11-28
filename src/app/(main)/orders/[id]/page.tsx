import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { executeGraphQL } from "@/lib/graphql";
import { OrderDocument, type LanguageCodeEnum } from "@/checkout/graphql";
import { formatDate, formatMoney } from "@/lib/utils";
import Image from "next/image";
import { PaymentStatus } from "@/ui/components/PaymentStatus";
import { OrderDownloadLinks } from "@/ui/components/OrderDownloadLinks";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";
import { getHrefForVariant } from "@/lib/utils";

export const metadata: Metadata = {
	title: "Order Details",
	description: "View your order details",
};

type Props = {
	params: Promise<{ id: string }>;
};

export default async function OrderDetailsPage({ params }: Props) {
	const { id } = await params;
	const decodedId = decodeURIComponent(id);

	const { order } = await executeGraphQL(OrderDocument, {
		variables: {
			id: decodedId,
			languageCode: "EN_US" as LanguageCodeEnum,
		},
		cache: "no-store",
	});

	if (!order) {
		notFound();
	}

	return (
		<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="mb-6">
				<LinkWithChannel
					href="/orders"
					className="text-sm text-blue-600 hover:text-blue-800"
				>
					← Back to Orders
				</LinkWithChannel>
			</div>

			<div className="mb-8">
				<h1 className="text-3xl font-bold text-neutral-900">
					Order #{order.number}
				</h1>
				<p className="mt-2 text-sm text-neutral-600">
					Placed on {formatDate(new Date(order.created))}
				</p>
			</div>

			{/* Order Summary */}
			<div className="mb-8 grid gap-6 md:grid-cols-3">
				<div className="rounded-lg border bg-white p-4">
					<h2 className="mb-2 text-sm font-medium text-neutral-500">
						Payment Status
					</h2>
					<PaymentStatus status={order.paymentStatus} />
				</div>
				<div className="rounded-lg border bg-white p-4">
					<h2 className="mb-2 text-sm font-medium text-neutral-500">
						Order Total
					</h2>
					<p className="text-2xl font-bold text-neutral-900">
						{formatMoney(order.total.gross.amount, order.total.gross.currency)}
					</p>
				</div>
				<div className="rounded-lg border bg-white p-4">
					<h2 className="mb-2 text-sm font-medium text-neutral-500">
						Payment Status
					</h2>
					<p className="text-lg font-medium text-neutral-900">
						{order.isPaid ? "Paid" : "Unpaid"}
					</p>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Order Items */}
				<div className="lg:col-span-2">
					<div className="rounded-lg border bg-white">
						<div className="border-b px-6 py-4">
							<h2 className="text-lg font-medium text-neutral-900">
								Order Items
							</h2>
						</div>
						<div className="px-6 py-4">
							<table className="w-full">
								<thead className="sr-only">
									<tr>
										<th>Product</th>
										<th>Quantity</th>
										<th>Price</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-neutral-200">
									{order.lines.map((item: any) => {
										if (!item.variant) {
											return null;
										}

										const product = item.variant.product;

										return (
											<tr key={item.id}>
												<td className="py-4 pr-4">
													<div className="flex items-center">
														{item.thumbnail && (
															<div className="mr-4 h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border bg-neutral-50">
																<Image
																	src={item.thumbnail.url}
																	alt={item.thumbnail.alt || `${item.productName} product image`}
																	width={80}
																	height={80}
																	className="h-full w-full object-contain object-center"
																/>
															</div>
														)}
														<div>
															<LinkWithChannel
																href={getHrefForVariant({
																	productSlug: product.slug,
																	variantId: item.variant.id,
																})}
																className="font-medium text-neutral-900 hover:text-neutral-700"
															>
																{item.productName}
															</LinkWithChannel>
															{item.variantName && (
																<p className="mt-1 text-sm text-neutral-500">
																	{item.variantName}
																</p>
															)}
															{item.variant.attributes.map((attr: any) => (
																<p
																	key={attr.values[0]?.name}
																	className="mt-1 text-sm text-neutral-500"
																>
																	{attr.values[0]?.translation?.name ||
																		attr.values[0]?.name}
																</p>
															))}
														</div>
													</div>
												</td>
												<td className="py-4 pr-4 text-center">
													<span className="text-neutral-900">
														{item.quantity}
													</span>
												</td>
												<td className="py-4 text-right">
													<p className="font-medium text-neutral-900">
														{formatMoney(
															item.totalPrice.gross.amount,
															item.totalPrice.gross.currency,
														)}
													</p>
													{item.quantity > 1 && (
														<p className="text-sm text-neutral-500">
															{formatMoney(
																item.unitPrice.gross.amount,
																item.unitPrice.gross.currency,
															)}{" "}
															each
														</p>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>

							<OrderDownloadLinks
								orderId={order.id}
								customerEmail={order.userEmail || ""}
							/>
						</div>

						{/* Order Totals */}
						<div className="border-t px-6 py-4">
							<dl className="space-y-2">
								<div className="flex justify-between text-sm">
									<dt className="text-neutral-600">Subtotal</dt>
									<dd className="font-medium text-neutral-900">
										{formatMoney(
											order.subtotal.gross.amount,
											order.subtotal.gross.currency,
										)}
									</dd>
								</div>
								{order.shippingPrice && (
									<div className="flex justify-between text-sm">
										<dt className="text-neutral-600">Shipping</dt>
										<dd className="font-medium text-neutral-900">
											{formatMoney(
												order.shippingPrice.gross.amount,
												order.shippingPrice.gross.currency,
											)}
										</dd>
									</div>
								)}
								{order.discounts && order.discounts.length > 0 && (
									<>
										{order.discounts.map((discount: any) => (
											<div
												key={discount.name}
												className="flex justify-between text-sm"
											>
												<dt className="text-neutral-600">
													{discount.name || "Discount"}
												</dt>
												<dd className="font-medium text-green-600">
													-
													{formatMoney(
														discount.amount.amount,
														discount.amount.currency,
													)}
												</dd>
											</div>
										))}
									</>
								)}
								{order.voucher && (
									<div className="flex justify-between text-sm">
										<dt className="text-neutral-600">
											Voucher ({order.voucher.code})
										</dt>
										<dd className="font-medium text-green-600">Applied</dd>
									</div>
								)}
								<div className="flex justify-between border-t pt-2 text-base font-medium">
									<dt className="text-neutral-900">Total</dt>
									<dd className="text-neutral-900">
										{formatMoney(
											order.total.gross.amount,
											order.total.gross.currency,
										)}
									</dd>
								</div>
							</dl>
						</div>
					</div>
				</div>

				{/* Shipping & Billing Information */}
				<div className="space-y-6">
					{/* Shipping Address */}
					{order.shippingAddress && (
						<div className="rounded-lg border bg-white p-4">
							<h2 className="mb-3 text-lg font-medium text-neutral-900">
								Shipping Address
							</h2>
							<address className="not-italic text-sm text-neutral-600">
								<p className="font-medium text-neutral-900">
									{order.shippingAddress.firstName}{" "}
									{order.shippingAddress.lastName}
								</p>
								<p>{order.shippingAddress.streetAddress1}</p>
								{order.shippingAddress.streetAddress2 && (
									<p>{order.shippingAddress.streetAddress2}</p>
								)}
								<p>
									{order.shippingAddress.city},{" "}
									{order.shippingAddress.countryArea}{" "}
									{order.shippingAddress.postalCode}
								</p>
								<p>{order.shippingAddress.country.country}</p>
								{order.shippingAddress.phone && (
									<p className="mt-2">{order.shippingAddress.phone}</p>
								)}
							</address>
						</div>
					)}

					{/* Billing Address */}
					{order.billingAddress && (
						<div className="rounded-lg border bg-white p-4">
							<h2 className="mb-3 text-lg font-medium text-neutral-900">
								Billing Address
							</h2>
							<address className="not-italic text-sm text-neutral-600">
								<p className="font-medium text-neutral-900">
									{order.billingAddress.firstName}{" "}
									{order.billingAddress.lastName}
								</p>
								<p>{order.billingAddress.streetAddress1}</p>
								{order.billingAddress.streetAddress2 && (
									<p>{order.billingAddress.streetAddress2}</p>
								)}
								<p>
									{order.billingAddress.city},{" "}
									{order.billingAddress.countryArea}{" "}
									{order.billingAddress.postalCode}
								</p>
								<p>{order.billingAddress.country.country}</p>
								{order.billingAddress.phone && (
									<p className="mt-2">{order.billingAddress.phone}</p>
								)}
							</address>
						</div>
					)}

					{/* Delivery Method */}
					{order.deliveryMethod && (
						<div className="rounded-lg border bg-white p-4">
							<h2 className="mb-3 text-lg font-medium text-neutral-900">
								Delivery Method
							</h2>
							{"name" in order.deliveryMethod && (
								<>
									<p className="text-sm text-neutral-900">
										{order.deliveryMethod.name}
									</p>
									{"minimumDeliveryDays" in order.deliveryMethod &&
										(order.deliveryMethod.minimumDeliveryDays ||
											order.deliveryMethod.maximumDeliveryDays) && (
											<p className="mt-1 text-sm text-neutral-600">
												Estimated delivery:{" "}
												{order.deliveryMethod.minimumDeliveryDays}-
												{order.deliveryMethod.maximumDeliveryDays} days
											</p>
										)}
								</>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
