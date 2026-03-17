"use client";

import GenericCarousel from "./GenericCarousel";

const DEFAULT_BRAND_ITEMS_PER_VIEW = { mobile: 2, tablet: 4, desktop: 6 };

interface BrandCarouselProps {
  title: string;
  items?: Array<{
    id: string;
    name: string;
    slug?: string;
    logo_url?: string;
    image?: string;
    product_count?: number;
  }>;
  autoplay?: boolean;
  autoplayIntervalMs?: number;
  itemsPerView?: { mobile: number; tablet: number; desktop: number };
}

export default function BrandCarousel({
  title,
  items,
  autoplay = true,
  autoplayIntervalMs = 4500,
  itemsPerView = DEFAULT_BRAND_ITEMS_PER_VIEW,
}: BrandCarouselProps) {
  return (
    <GenericCarousel
      type="brands"
      filterType="brand"
      title={title}
      items={items}
      maxItems={12}
      autoplay={autoplay}
      autoplayIntervalMs={autoplayIntervalMs}
      itemsPerView={itemsPerView}
    />
  );
}
