"use client";

import GenericCarousel from "./GenericCarousel";

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
}

export default function BrandCarousel({
  title,
  items,
  autoplay = true,
  autoplayIntervalMs = 4500,
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
      itemsPerView={{ mobile: 2, tablet: 4, desktop: 6 }}
    />
  );
}
