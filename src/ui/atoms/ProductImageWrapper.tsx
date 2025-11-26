"use client";

import NextImage, { type ImageProps } from "next/image";
import { useState } from "react";

const FALLBACK_IMAGE = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzIxMjEyMSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIHVuYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==";
const MAX_RETRIES = 2;

export const ProductImageWrapper = (props: ImageProps) => {
	const { priority = false, loading = "lazy", sizes, onError, onLoad, ...restProps } = props;
	const [retryCount, setRetryCount] = useState(0);
	const [hasError, setHasError] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [currentSrc, setCurrentSrc] = useState(props.src);

	// Default sizes for product grid (3 columns on desktop, 2 on tablet, 1 on mobile)
	// Based on max-w-7xl container (1280px) with p-8 padding and gap-8
	const defaultSizes = "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 384px";

	const handleError = () => {
		if (retryCount < MAX_RETRIES) {
			// Retry with cache-busting timestamp
			const separator = currentSrc.toString().includes("?") ? "&" : "?";
			const newSrc = `${currentSrc}${separator}_retry=${Date.now()}`;
			setCurrentSrc(newSrc);
			setRetryCount((prev) => prev + 1);
		} else {
			setHasError(true);
			setIsLoading(false);
			onError?.();
		}
	};

	const handleLoad = () => {
		setIsLoading(false);
		setHasError(false);
		onLoad?.();
	};

	return (
		<div className="relative aspect-square overflow-hidden bg-base-900">
			{isLoading && !hasError && (
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-base-700 border-t-base-400" />
				</div>
			)}
			<NextImage
				{...restProps}
				src={hasError ? FALLBACK_IMAGE : currentSrc}
				priority={priority}
				loading={priority ? undefined : loading}
				fetchPriority={priority ? "high" : "low"}
				className="h-full w-full object-contain object-center p-4 transition-transform duration-300 hover:scale-105"
				quality={85}
				placeholder="blur"
				blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQ3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
				sizes={sizes || defaultSizes}
				onError={handleError}
				onLoad={handleLoad}
			/>
		</div>
	);
};
