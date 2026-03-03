export function shouldReparentImportedCategory(input: {
  isNewCategory: boolean;
  isParentLocked: boolean;
  hasKnownCurrentParent: boolean;
  currentParentSlug?: string | null;
  recommendedParentSlug: string;
}): boolean {
  const {
    isNewCategory,
    isParentLocked,
    hasKnownCurrentParent,
    currentParentSlug,
    recommendedParentSlug,
  } = input;

  if (isNewCategory) return true;
  if (isParentLocked) return false;

  if (!currentParentSlug) return true;
  if (currentParentSlug === recommendedParentSlug) return false;

  return !hasKnownCurrentParent;
}
