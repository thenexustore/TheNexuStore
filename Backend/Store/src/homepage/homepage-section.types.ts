export enum HomepageSectionType {
  HERO_BANNER_SLIDER = 'HERO_BANNER_SLIDER',
  TOP_CATEGORIES_GRID = 'TOP_CATEGORIES_GRID',
  BEST_DEALS = 'BEST_DEALS',
  NEW_ARRIVALS = 'NEW_ARRIVALS',
  FEATURED_PICKS = 'FEATURED_PICKS',
  BRANDS_STRIP = 'BRANDS_STRIP',
  TRUST_BAR = 'TRUST_BAR',
}

export const DEFAULT_HOMEPAGE_SECTIONS: Array<{
  type: HomepageSectionType;
  title?: string;
  position: number;
  config_json: Record<string, any>;
}> = [
  {
    type: HomepageSectionType.HERO_BANNER_SLIDER,
    title: 'Hero Banner',
    position: 1,
    config_json: { items_per_carousel: 1 },
  },
  {
    type: HomepageSectionType.TOP_CATEGORIES_GRID,
    title: 'Top Categories',
    position: 2,
    config_json: { source: 'query', limit: 10 },
  },
  {
    type: HomepageSectionType.BEST_DEALS,
    title: 'Best Deals',
    position: 3,
    config_json: { source: 'query', limit: 12 },
  },
  {
    type: HomepageSectionType.NEW_ARRIVALS,
    title: 'New Arrivals',
    position: 4,
    config_json: { source: 'query', limit: 12, sort_by: 'newest' },
  },
  {
    type: HomepageSectionType.FEATURED_PICKS,
    title: 'Featured Picks',
    position: 5,
    config_json: { source: 'query', limit: 12 },
  },
  {
    type: HomepageSectionType.BRANDS_STRIP,
    title: 'Top Brands',
    position: 6,
    config_json: { source: 'query', limit: 12 },
  },
  {
    type: HomepageSectionType.TRUST_BAR,
    title: 'Why shop with us',
    position: 7,
    config_json: {
      items: [
        { icon: 'truck', text: 'Fast delivery' },
        { icon: 'shield', text: 'Secure payments' },
        { icon: 'refresh-ccw', text: 'Easy returns' },
      ],
    },
  },
];
