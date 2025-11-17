"use client";

import { useEffect, useState } from "react";
import { Download, Clock, Hash } from "lucide-react";

type DownloadItem = {
	productName: string;
	variantName?: string;
	downloadUrl: string;
	expiresAt?: string;
	maxDownloads?: number;
	downloadCount: number;
	createdAt: string;
};

type Props = {
	orderId: string;
	customerEmail: string;
};

export const OrderDownloadLinks = ({ orderId, customerEmail }: Props) => {
	const [downloads, setDownloads] = useState<DownloadItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchDownloads = async () => {
			try {
				setLoading(true);
				setError(null);

				// Get the base URL from environment or use a default
				const baseUrl =
					process.env.NEXT_PUBLIC_DIGITAL_DOWNLOADS_URL ||
					"https://saleor-digital-downloads.sonicdrivestudio.com";

				const url = new URL(`/api/orders/${orderId}/downloads`, baseUrl);
				url.searchParams.set("email", customerEmail);

				const response = await fetch(url.toString());

				if (!response.ok) {
					throw new Error("Failed to fetch download links");
				}

				const data = (await response.json()) as { downloads: DownloadItem[] };
				setDownloads(data.downloads || []);
			} catch (err) {
				console.error("Error fetching downloads:", err);
				setError("Failed to load download links");
			} finally {
				setLoading(false);
			}
		};

		fetchDownloads();
	}, [orderId, customerEmail]);

	if (loading) {
		return (
			<div className="border-t bg-neutral-50 px-6 py-4 md:border-x">
				<div className="flex items-center gap-2 text-sm text-neutral-500">
					<div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600"></div>
					<span>Loading downloads...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="border-t bg-red-50 px-6 py-4 md:border-x">
				<p className="text-sm text-red-600">{error}</p>
			</div>
		);
	}

	if (downloads.length === 0) {
		return null;
	}

	return (
		<div className="border-t bg-blue-50 px-6 py-4 md:border-x">
			<div className="mb-3 flex items-center gap-2">
				<Download className="h-5 w-5 text-blue-600" />
				<h3 className="font-medium text-neutral-900">Digital Downloads</h3>
			</div>

			<div className="space-y-3">
				{downloads.map((download, index) => {
					const isExpired = download.expiresAt && new Date(download.expiresAt) < new Date();
					const isLimitReached =
						download.maxDownloads !== undefined &&
						download.downloadCount >= download.maxDownloads;

					const isDisabled = isExpired || isLimitReached;

					return (
						<div
							key={index}
							className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
						>
							<div className="flex-1">
								<p className="font-medium text-neutral-900">{download.productName}</p>
								{download.variantName && (
									<p className="text-sm text-neutral-600">Variant: {download.variantName}</p>
								)}

								<div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-500">
									{download.expiresAt ? (
										<div className="flex items-center gap-1">
											<Clock className="h-3 w-3" />
											<span>
												{isExpired ? (
													<span className="text-red-600">Expired</span>
												) : (
													`Expires ${new Date(download.expiresAt).toLocaleDateString()}`
												)}
											</span>
										</div>
									) : (
										<div className="flex items-center gap-1">
											<Clock className="h-3 w-3" />
											<span className="text-green-600">Never expires</span>
										</div>
									)}

									{download.maxDownloads !== undefined ? (
										<div className="flex items-center gap-1">
											<Hash className="h-3 w-3" />
											<span>
												{download.downloadCount} / {download.maxDownloads} downloads
											</span>
										</div>
									) : (
										<div className="flex items-center gap-1">
											<Hash className="h-3 w-3" />
											<span className="text-green-600">Unlimited downloads</span>
										</div>
									)}
								</div>
							</div>

							<a
								href={download.downloadUrl}
								className={`flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
									isDisabled
										? "cursor-not-allowed bg-neutral-200 text-neutral-400"
										: "bg-blue-600 text-white hover:bg-blue-700"
								}`}
								{...(isDisabled && { "aria-disabled": true, onClick: (e) => e.preventDefault() })}
							>
								<Download className="h-4 w-4" />
								{isLimitReached ? "Limit Reached" : isExpired ? "Expired" : "Download"}
							</a>
						</div>
					);
				})}
			</div>
		</div>
	);
};
