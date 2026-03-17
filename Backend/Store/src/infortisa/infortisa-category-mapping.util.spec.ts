import {
  getParentCategorySortOrder,
  recommendParentCategory,
  isKnownParentCategorySlug,
  slugifyCategory,
} from './infortisa-category-mapping.util';

describe('Infortisa category mapping', () => {
  it('maps networking families into Redes y servidores', () => {
    const result = recommendParentCategory(
      'Networking',
      'Switches Gestionables',
    );
    expect(result.label).toBe('Redes y servidores');
  });

  it('maps laptops into Ordenadores y portátiles', () => {
    const result = recommendParentCategory('Portátiles', 'Ultrabooks');
    expect(result.label).toBe('Ordenadores y portátiles');
  });

  it('maps televisions into TV, audio y vídeo', () => {
    const result = recommendParentCategory('Televisión', 'Smart TV OLED');
    expect(result.label).toBe('TV, audio y vídeo');
  });

  it('maps soundbars into TV, audio y vídeo', () => {
    const result = recommendParentCategory('Audio', 'Barra de sonido 3.1');
    expect(result.label).toBe('TV, audio y vídeo');
  });

  it('prioritizes subfamily keywords in correct parent when family is generic', () => {
    const result = recommendParentCategory('Hardware', 'Impresoras Láser');
    expect(result.label).toBe('Impresión y escaneado');
  });

  it('falls back to Accesorios y consumibles', () => {
    const result = recommendParentCategory('Miscelánea', 'Varios');
    expect(result.label).toBe('Accesorios y consumibles');
  });

  it('slugifies accents and punctuation', () => {
    expect(slugifyCategory('TV, audio y vídeo')).toBe('tv-audio-y-video');
  });

  it('recognizes canonical parent slugs from both key and label', () => {
    expect(isKnownParentCategorySlug('ordenadores-portatiles')).toBe(true);
    expect(isKnownParentCategorySlug('tv-audio-y-video')).toBe(true);
  });

  it('returns stable sort order for parent categories', () => {
    expect(getParentCategorySortOrder('Redes y servidores')).toBe(50);
    expect(getParentCategorySortOrder('TV, audio y vídeo')).toBe(65);
    expect(getParentCategorySortOrder('Unknown')).toBe(90);
  });

  // New keyword coverage tests
  it('maps laptop keyword into Ordenadores y portátiles', () => {
    expect(recommendParentCategory('laptop', null).label).toBe(
      'Ordenadores y portátiles',
    );
  });

  it('maps barebone keyword into Ordenadores y portátiles', () => {
    expect(recommendParentCategory('barebone', null).label).toBe(
      'Ordenadores y portátiles',
    );
  });

  it('maps cooler keyword into Componentes y almacenamiento', () => {
    expect(recommendParentCategory(null, 'Cooler CPU').label).toBe(
      'Componentes y almacenamiento',
    );
  });

  it('maps cartucho keyword into Impresión y escaneado', () => {
    expect(recommendParentCategory(null, 'Cartucho tinta HP').label).toBe(
      'Impresión y escaneado',
    );
  });

  it('maps mesh keyword into Redes y servidores', () => {
    expect(recommendParentCategory(null, 'Sistema Mesh WiFi 6').label).toBe(
      'Redes y servidores',
    );
  });

  it('maps gps keyword into Telefonía y movilidad', () => {
    expect(recommendParentCategory(null, 'GPS para coche').label).toBe(
      'Telefonía y movilidad',
    );
  });

  it('maps proyector tv keyword into TV, audio y vídeo', () => {
    expect(recommendParentCategory(null, 'Proyector TV 4K').label).toBe(
      'TV, audio y vídeo',
    );
  });

  it('maps windows keyword into Software y seguridad', () => {
    expect(recommendParentCategory(null, 'Windows 11 Pro').label).toBe(
      'Software y seguridad',
    );
  });

  it('maps gamepad keyword into Gaming y smart home', () => {
    expect(recommendParentCategory(null, 'Gamepad inalámbrico').label).toBe(
      'Gaming y smart home',
    );
  });

  it('maps cable keyword into Accesorios y consumibles', () => {
    expect(recommendParentCategory('cable', null).label).toBe(
      'Accesorios y consumibles',
    );
  });

  it('maps regleta keyword into Accesorios y consumibles', () => {
    expect(recommendParentCategory(null, 'Regleta 6 tomas').label).toBe(
      'Accesorios y consumibles',
    );
  });

  it('returns sort order 90 for Accesorios y consumibles (now in taxonomy array)', () => {
    expect(getParentCategorySortOrder('Accesorios y consumibles')).toBe(90);
  });
});
