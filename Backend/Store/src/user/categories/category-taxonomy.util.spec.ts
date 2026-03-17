import {
  buildCategoryTaxonomyTree,
  getDescendantIds,
} from './category-taxonomy.util';

describe('category-taxonomy.util', () => {
  const rows = [
    {
      id: 'grandparent-a',
      name: 'A',
      slug: 'a',
      parent_id: null,
      sort_order: 2,
    },
    {
      id: 'parent-a1',
      name: 'A1',
      slug: 'a-1',
      parent_id: 'grandparent-a',
      sort_order: 1,
    },
    {
      id: 'child-a1-1',
      name: 'A11',
      slug: 'a-1-1',
      parent_id: 'parent-a1',
      sort_order: 1,
    },
    {
      id: 'orphan',
      name: 'Orphan',
      slug: 'orphan',
      parent_id: 'missing',
      sort_order: 3,
    },
    {
      id: 'grandparent-b',
      name: 'B',
      slug: 'b',
      parent_id: null,
      sort_order: 1,
    },
  ];

  it('builds deterministic tree and preserves ancestry path', () => {
    const tree = buildCategoryTaxonomyTree(rows, 3);

    expect(tree.map((node) => node.id)).toEqual([
      'grandparent-b',
      'grandparent-a',
      'orphan',
    ]);
    expect(tree[1].children[0].children[0].path).toBe('A > A1 > A11');
    expect(
      tree[1].children[0].children[0].ancestry.map((item) => item.slug),
    ).toEqual(['a', 'a-1', 'a-1-1']);
  });

  it('stops recursion when a cycle is detected', () => {
    const cyclic = [
      { id: 'x', name: 'X', slug: 'x', parent_id: 'y', sort_order: 1 },
      { id: 'y', name: 'Y', slug: 'y', parent_id: 'x', sort_order: 2 },
    ];

    expect(buildCategoryTaxonomyTree(cyclic, 5)).toEqual([]);
  });

  it('collects descendants including root id once', () => {
    const descendants = getDescendantIds('grandparent-a', rows);
    expect(descendants).toEqual(['grandparent-a', 'parent-a1', 'child-a1-1']);
  });
});
