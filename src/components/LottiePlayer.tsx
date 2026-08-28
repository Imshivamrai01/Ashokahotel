"use client";

/**
 * LottiePlayer — lightweight wrapper around lottie-react.
 * Dynamically imported so it never ships in the SSR bundle.
 * Falls back to a simple spinner / icon if the JSON fails to load.
 */

import dynamic from "next/dynamic";
import { ComponentType } from "react";

// Lazy-load lottie-react — avoids SSR issues
const Lottie = dynamic(() => import("lottie-react"), {
  ssr: false,
}) as ComponentType<{
  animationData: object;
  loop?: boolean;
  autoplay?: boolean;
  style?: React.CSSProperties;
  className?: string;
}>;

// Pre-import JSONs (Next.js resolves these at build time)
import loadingData from "@/../public/lottie/loading.json";
import successData from "@/../public/lottie/success.json";
import emptyCartData from "@/../public/lottie/empty-cart.json";
import noResultsData from "@/../public/lottie/no-results.json";

export type LottieVariant = "loading" | "success" | "empty-cart" | "no-results";

const ANIMATION_MAP: Record<LottieVariant, object> = {
  loading: loadingData,
  success: successData,
  "empty-cart": emptyCartData,
  "no-results": noResultsData,
};

const DEFAULT_LOOP: Record<LottieVariant, boolean> = {
  loading: true,
  success: false,
  "empty-cart": true,
  "no-results": true,
};

interface LottiePlayerProps {
  variant: LottieVariant;
  /** Width & height in px (square). Default 120. */
  size?: number;
  /** Override loop behaviour */
  loop?: boolean;
  className?: string;
}

export default function LottiePlayer({
  variant,
  size = 120,
  loop,
  className,
}: LottiePlayerProps) {
  const animationData = ANIMATION_MAP[variant];
  const shouldLoop = loop ?? DEFAULT_LOOP[variant];

  return (
    <Lottie
      animationData={animationData}
      loop={shouldLoop}
      autoplay
      style={{ width: size, height: size }}
      className={className}
    />
  );
}
