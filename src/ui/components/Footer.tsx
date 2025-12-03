import Link from "next/link";
import { ChannelSelect } from "./ChannelSelect";
import { ChannelsListDocument, MenuGetBySlugDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";
import { CookiePreferencesButton } from "@/components/CookieConsent";
import { DEFAULT_CHANNEL } from "@/app/config";
import { headers } from "next/headers";

export async function Footer() {
	// Access headers to indicate this component uses dynamic data
	await headers();

	let footerLinks = null;
	let channels = null;

	try {
		footerLinks = await executeGraphQL(MenuGetBySlugDocument, {
			variables: { slug: "footer", channel: DEFAULT_CHANNEL },
			revalidate: 60 * 60 * 24,
			withAuth: false,
		});
	} catch (error) {
		console.error("Failed to fetch footer menu:", error);
	}

	try {
		channels = process.env.SALEOR_APP_TOKEN
			? await executeGraphQL(ChannelsListDocument, {
					withAuth: false,
					headers: {
						Authorization: `Bearer ${process.env.SALEOR_APP_TOKEN}`,
					},
				})
			: null;
	} catch (error) {
		console.error("Failed to fetch channels:", error);
	}

	const currentYear = new Date().getFullYear();

	return (
		<footer id="footer" className="mt-24 border-t border-base-900 bg-base-950 transition-all duration-300">
			<div className="mx-auto max-w-7xl px-6 lg:px-12">
				<div className="grid grid-cols-1 gap-12 py-20 md:grid-cols-3 md:gap-16">
					{footerLinks!.menu?.items?.map((item) => {
						return (
							<div key={item.id}>
								<h3 className="mb-6 font-display text-sm font-medium uppercase tracking-wider text-white">
									{item.name}
								</h3>
								<ul className="space-y-4">
									{item.children?.map((child) => {
										if (child.category) {
											return (
												<li key={child.id}>
													<Link
														href={`/categories/${child.category.slug}`}
														className="text-base-300 transition-colors duration-200 hover:text-accent-200"
													>
														{child.category.name}
													</Link>
												</li>
											);
										}
										if (child.collection) {
											return (
												<li key={child.id}>
													<Link
														href={`/collections/${child.collection.slug}`}
														className="text-base-300 transition-colors duration-200 hover:text-accent-200"
													>
														{child.collection.name}
													</Link>
												</li>
											);
										}
										if (child.page) {
											return (
												<li key={child.id}>
													<Link
														href={`/pages/${child.page.slug}`}
														className="text-base-300 transition-colors duration-200 hover:text-accent-200"
													>
														{child.page.title}
													</Link>
												</li>
											);
										}
										if (child.url) {
											return (
												<li key={child.id}>
													<Link
														href={child.url}
														className="text-base-300 transition-colors duration-200 hover:text-accent-200"
													>
														{child.name}
													</Link>
												</li>
											);
										}
										return null;
									})}
								</ul>
							</div>
						);
					})}
				</div>

				{channels?.channels && (
					<div className="mb-8 border-b border-base-900 pb-8">
						<label className="flex items-center gap-3 text-base-300">
							<span className="text-sm font-medium">Change currency:</span>
							<ChannelSelect channels={channels.channels} />
						</label>
					</div>
				)}

				<div className="flex flex-col gap-4 border-t border-base-900 py-10">
					<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
						<p className="text-sm text-base-300">
							Contact:{" "}
							<a
								href="mailto:jon@sonicdrivestudio.com"
								className="text-accent-200 underline transition-colors duration-200 hover:text-accent-100"
							>
								jon@sonicdrivestudio.com
							</a>
						</p>
						<CookiePreferencesButton />
					</div>
					<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
						<p className="text-sm text-base-300">
							🌅 Crafted with care by{" "}
							<a
								href="https://www.daybreakdevelopment.eu/"
								target="_blank"
								rel="noopener noreferrer"
								className="text-accent-200 underline transition-colors duration-200 hover:text-accent-100"
							>
								Daybreak Development
							</a>
						</p>
						<p className="text-sm text-base-300">
							Copyright &copy; {currentYear} Sonic Drive Studio. All rights reserved.
						</p>
					</div>
				</div>
			</div>
		</footer>
	);
}
