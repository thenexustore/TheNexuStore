'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { homeBuilderApi } from '@/lib/api/home-builder';

const SECTION_TYPES = ['HERO_CAROUSEL', 'CATEGORY_STRIP', 'PRODUCT_CAROUSEL', 'BRAND_STRIP', 'VALUE_PROPS', 'TRENDING_CHIPS'] as const;

const DEFAULT_CONFIG: Record<string, Record<string, any>> = {
  HERO_CAROUSEL: { autoplay: true, interval_ms: 5000 },
  CATEGORY_STRIP: { mode: 'auto', limit: 10 },
  PRODUCT_CAROUSEL: { mode: 'rule', source: 'BEST_DEALS', limit: 12, inStockOnly: true },
  BRAND_STRIP: { mode: 'auto', limit: 12 },
  VALUE_PROPS: { items: [{ text: 'Fast delivery' }, { text: 'Secure payments' }, { text: 'Easy returns' }] },
  TRENDING_CHIPS: { items: [{ text: 'RTX 5090', href: '/products?q=rtx' }, { text: 'Laptops', href: '/products?q=laptop' }] },
};

export default function HomeBuilderPage() {
  const [layouts, setLayouts] = useState<any[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
  const [sections, setSections] = useState<any[]>([]);
  const [newSectionType, setNewSectionType] = useState<(typeof SECTION_TYPES)[number]>('HERO_CAROUSEL');

  const selectedLayout = useMemo(() => layouts.find((x) => x.id === selectedLayoutId), [layouts, selectedLayoutId]);

  const loadLayouts = async () => {
    try {
      const data = await homeBuilderApi.layouts();
      setLayouts(data);
      if (!selectedLayoutId && data[0]) setSelectedLayoutId(data[0].id);
    } catch (e: any) {
      toast.error(e.message || 'Error loading layouts');
    }
  };

  const loadSections = async (layoutId: string) => {
    if (!layoutId) return;
    try {
      setSections(await homeBuilderApi.sections(layoutId));
    } catch (e: any) {
      toast.error(e.message || 'Error loading sections');
    }
  };

  const addStarterSections = async () => {
    if (!selectedLayoutId) return;
    if (sections.length > 0 && !confirm('This will append starter sections. Continue?')) return;

    const start = sections.length;
    const starters: Array<(typeof SECTION_TYPES)[number]> = [
      'HERO_CAROUSEL',
      'CATEGORY_STRIP',
      'PRODUCT_CAROUSEL',
      'PRODUCT_CAROUSEL',
      'BRAND_STRIP',
      'VALUE_PROPS',
      'TRENDING_CHIPS',
    ];

    try {
      for (const [idx, type] of starters.entries()) {
        const title =
          type === 'PRODUCT_CAROUSEL' && idx === 2
            ? 'Best Deals'
            : type === 'PRODUCT_CAROUSEL' && idx === 3
              ? 'New Arrivals'
              : type.replaceAll('_', ' ');
        const config = { ...DEFAULT_CONFIG[type] };
        if (type === 'PRODUCT_CAROUSEL' && idx === 3) config.source = 'NEW_ARRIVALS';

        await homeBuilderApi.createSection(selectedLayoutId, {
          type,
          title,
          position: start + idx + 1,
          is_enabled: true,
          config,
        });
      }
      toast.success('Starter sections added');
      await loadSections(selectedLayoutId);
    } catch (e: any) {
      toast.error(e.message || 'Failed to add starter sections');
    }
  };

  useEffect(() => {
    loadLayouts();
  }, []);

  useEffect(() => {
    loadSections(selectedLayoutId);
  }, [selectedLayoutId]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Contenido Home</h1>
        <button
          className="rounded bg-black px-3 py-2 text-sm text-white"
          onClick={async () => {
            const name = prompt('Layout name');
            if (!name) return;
            await homeBuilderApi.createLayout({ name });
            toast.success('Layout created');
            await loadLayouts();
          }}
        >
          Add layout
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {layouts.map((layout) => (
          <button
            key={layout.id}
            className={`rounded border px-3 py-1 text-sm ${selectedLayoutId === layout.id ? 'bg-black text-white' : 'bg-white'}`}
            onClick={() => setSelectedLayoutId(layout.id)}
          >
            {layout.name} {layout.is_active ? '(Published)' : ''}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded border px-3 py-2 text-sm"
          onClick={async () => {
            if (!selectedLayoutId) return;
            await homeBuilderApi.updateLayout(selectedLayoutId, { is_active: true });
            toast.success('Layout published');
            await loadLayouts();
          }}
        >
          Publish layout
        </button>
        <button className="rounded border px-3 py-2 text-sm" onClick={() => window.open(`/store?previewLayoutId=${selectedLayoutId}`, '_blank')}>
          Preview in Store
        </button>
        <button
          className="rounded border px-3 py-2 text-sm"
          onClick={async () => {
            if (!selectedLayoutId) return;
            await homeBuilderApi.cloneLayout(selectedLayoutId);
            toast.success('Layout cloned');
            await loadLayouts();
          }}
        >
          Clone layout
        </button>
        <button
          className="rounded border border-red-300 px-3 py-2 text-sm text-red-600"
          onClick={async () => {
            if (!selectedLayoutId || !selectedLayout) return;
            if (!confirm(`Delete layout "${selectedLayout.name}"?`)) return;
            await homeBuilderApi.deleteLayout(selectedLayoutId, true);
            toast.success('Layout deleted');
            setSelectedLayoutId('');
            await loadLayouts();
          }}
        >
          Delete layout
        </button>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Sections</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded border px-2 py-2 text-sm"
              value={newSectionType}
              onChange={(e) => setNewSectionType(e.target.value as (typeof SECTION_TYPES)[number])}
            >
              {SECTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <button
              className="rounded bg-black px-3 py-2 text-sm text-white"
              onClick={async () => {
                await homeBuilderApi.createSection(selectedLayoutId, {
                  type: newSectionType,
                  position: sections.length + 1,
                  is_enabled: true,
                  title: newSectionType.replaceAll('_', ' '),
                  config: DEFAULT_CONFIG[newSectionType],
                });
                await loadSections(selectedLayoutId);
              }}
            >
              Add section
            </button>
            <button className="rounded border px-3 py-2 text-sm" onClick={addStarterSections}>
              Add starter pack
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {sections.map((section, idx) => (
            <div key={section.id} className="rounded border p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{section.title || section.type}</div>
                  <div className="text-xs text-zinc-500">{section.type}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={async () => {
                      await homeBuilderApi.updateSection(section.id, { is_enabled: !section.is_enabled });
                      await loadSections(selectedLayoutId);
                    }}
                  >
                    {section.is_enabled ? 'Disable' : 'Enable'}
                  </button>
                  {idx > 0 && (
                    <button className="rounded border px-2 py-1 text-xs" onClick={async () => { await homeBuilderApi.moveSection(section.id, idx); await loadSections(selectedLayoutId); }}>
                      ↑
                    </button>
                  )}
                  {idx < sections.length - 1 && (
                    <button className="rounded border px-2 py-1 text-xs" onClick={async () => { await homeBuilderApi.moveSection(section.id, idx + 2); await loadSections(selectedLayoutId); }}>
                      ↓
                    </button>
                  )}
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={async () => {
                      const title = prompt('Title', section.title || '') || undefined;
                      const subtitle = prompt('Subtitle', section.subtitle || '') || undefined;
                      const variant = prompt('Variant', section.variant || '') || undefined;
                      const config = prompt('Config JSON', JSON.stringify(section.config || {}));
                      await homeBuilderApi.updateSection(section.id, { title, subtitle, variant, config: config ? JSON.parse(config) : {} });
                      await loadSections(selectedLayoutId);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="rounded border px-2 py-1 text-xs text-red-600"
                    onClick={async () => {
                      await homeBuilderApi.deleteSection(section.id);
                      await loadSections(selectedLayoutId);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!sections.length && <div className="text-sm text-zinc-500">No sections yet.</div>}
        </div>
      </div>
    </div>
  );
}
