import { shouldReparentImportedCategory } from './infortisa-category-parent-policy.util';

describe('Infortisa category parent policy', () => {
  it('does not reparent existing category when lock is enabled', () => {
    expect(
      shouldReparentImportedCategory({
        isNewCategory: false,
        isParentLocked: true,
        hasKnownCurrentParent: true,
        currentParentSlug: 'manual-parent',
        recommendedParentSlug: 'redes-servidores',
      }),
    ).toBe(false);
  });

  it('keeps existing known parent when unlocked', () => {
    expect(
      shouldReparentImportedCategory({
        isNewCategory: false,
        isParentLocked: false,
        hasKnownCurrentParent: true,
        currentParentSlug: 'ordenadores-portatiles',
        recommendedParentSlug: 'redes-servidores',
      }),
    ).toBe(false);
  });

  it('allows upgrading from unknown fallback parent when unlocked', () => {
    expect(
      shouldReparentImportedCategory({
        isNewCategory: false,
        isParentLocked: false,
        hasKnownCurrentParent: false,
        currentParentSlug: 'legacy-parent',
        recommendedParentSlug: 'redes-servidores',
      }),
    ).toBe(true);
  });

  it('assigns parent for brand new category', () => {
    expect(
      shouldReparentImportedCategory({
        isNewCategory: true,
        isParentLocked: false,
        hasKnownCurrentParent: false,
        currentParentSlug: null,
        recommendedParentSlug: 'redes-servidores',
      }),
    ).toBe(true);
  });
});
