import {
  getParentCategorySortOrder,
  recommendParentCategory,
  slugifyCategory,
} from './infortisa-category-mapping.util';

describe('Infortisa category mapping', () => {
  it('maps networking families into Redes y servidores', () => {
    const result = recommendParentCategory('Networking', 'Switches Gestionables');
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

  it('returns stable sort order for parent categories', () => {
    expect(getParentCategorySortOrder('Redes y servidores')).toBe(50);
    expect(getParentCategorySortOrder('TV, audio y vídeo')).toBe(65);
    expect(getParentCategorySortOrder('Unknown')).toBe(90);
  });
});
