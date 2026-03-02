import { generateDeterministicProductSlug } from './product-slug.util';

describe('generateDeterministicProductSlug', () => {
  it('appends SKU and prevents collisions for same product name', () => {
    const name = 'Same Laptop Model';

    const slugA = generateDeterministicProductSlug(name, 'SKU-001');
    const slugB = generateDeterministicProductSlug(name, 'SKU-002');

    expect(slugA).toBe('same-laptop-model-sku-001');
    expect(slugB).toBe('same-laptop-model-sku-002');
    expect(slugA).not.toBe(slugB);
  });

  it('returns null when SKU is missing', () => {
    expect(generateDeterministicProductSlug('Any Name', '')).toBeNull();
    expect(generateDeterministicProductSlug('Any Name', null)).toBeNull();
  });
});
