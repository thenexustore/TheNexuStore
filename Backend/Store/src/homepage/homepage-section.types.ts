export enum HomepageSectionType {
  HERO_BANNER_SLIDER = 'HERO_BANNER_SLIDER',
  PRODUCT_CAROUSEL = 'PRODUCT_CAROUSEL',
  FEATURED_PICKS = 'FEATURED_PICKS',
  BEST_DEALS = 'BEST_DEALS',
  NEW_ARRIVALS = 'NEW_ARRIVALS',
  TOP_CATEGORIES_GRID = 'TOP_CATEGORIES_GRID',
  BRANDS_STRIP = 'BRANDS_STRIP',
  TRUST_BAR = 'TRUST_BAR',
  NEWSLETTER = 'NEWSLETTER',
}

export const DEFAULT_HOMEPAGE_SECTIONS: Array<{
  type: HomepageSectionType;
  title?: string;
  position: number;
  config_json: Record<string, any>;
}> = [
  {
    type: HomepageSectionType.HERO_BANNER_SLIDER,
    title: 'Banner principal',
    position: 1,
    config_json: { items_per_carousel: 1 },
  },
  {
    type: HomepageSectionType.PRODUCT_CAROUSEL,
    title: 'Productos destacados',
    position: 2,
    config_json: {
      source: 'query',
      query: {
        type: 'products',
        featuredOnly: true,
        inStockOnly: true,
        sortBy: 'newest',
        limit: 12,
      },
      carousel_enabled: true,
      carousel_autoplay: true,
      carousel_interval_ms: 4500,
      carousel_items_desktop: 4,
      carousel_items_mobile: 2,
    },
  },
  {
    type: HomepageSectionType.BRANDS_STRIP,
    title: 'Marcas destacadas',
    position: 3,
    config_json: { source: 'query', query: { type: 'brands', limit: 12 } },
  },
  {
    type: HomepageSectionType.TRUST_BAR,
    title: 'Por qué comprar con nosotros',
    position: 4,
    config_json: {
      items: [
        { icon: 'truck', text: 'Entrega 24/48h en miles de referencias' },
        { icon: 'shield', text: 'Pagos 100% seguros y cifrados' },
        {
          icon: 'refresh-ccw',
          text: 'Devoluciones simples y soporte postventa',
        },
        {
          icon: 'headset',
          text: 'Atención experta antes y después de comprar',
        },
      ],
    },
  },

  {
    type: HomepageSectionType.NEWSLETTER,
    title: 'Suscríbete a nuestra newsletter',
    position: 5,
    config_json: {
      title: 'Suscríbete a nuestra newsletter',
      subtitle: 'Recibe ofertas, novedades y lanzamientos antes que nadie.',
      placeholder: 'Tu email',
      button_text: 'Suscribirme',
      button_link: '/register',
    },
  },
];
