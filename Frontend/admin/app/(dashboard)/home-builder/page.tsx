'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { HomeLayout, HomeSection, homeBuilderApi } from '@/lib/api/home-builder';
import { SITE_URL } from '@/lib/constants';

const SECTION_TYPES = ['HERO_CAROUSEL', 'CATEGORY_STRIP', 'PRODUCT_CAROUSEL', 'BRAND_STRIP', 'VALUE_PROPS', 'TRENDING_CHIPS'];

function prettyJson(value: Record<string, unknown>) {
  return JSON.stringify(value || {}, null, 2);
}

export default function HomeBuilderPage() {
  const [layouts, setLayouts] = useState<HomeLayout[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState('');
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [savingSectionId, setSavingSectionId] = useState<string | null>(null);
  const [configDrafts, setConfigDrafts] = useState<Record<string, string>>({});
  const [loadingLayouts, setLoadingLayouts] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);

  const selectedLayout = useMemo(
    () => layouts.find((layout) => layout.id === selectedLayoutId) || null,
    [layouts, selectedLayoutId],
  );

  const loadLayouts = useCallback(async () => {
    setLoadingLayouts(true);
    try {
      const data = await homeBuilderApi.layouts();
      setLayouts(data);
      setSelectedLayoutId((prev) => prev || data[0]?.id || '');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error loading layouts';
      toast.error(message);
    } finally {
      setLoadingLayouts(false);
    }
  }, []);

  const loadSections = useCallback(async (layoutId: string) => {
    if (!layoutId) {
      setSections([]);
      return;
    }

    setLoadingSections(true);
    try {
      const data = await homeBuilderApi.sections(layoutId);
      setSections(data);
      setConfigDrafts(
        data.reduce<Record<string, string>>((acc, section) => {
          acc[section.id] = prettyJson(section.config);
          return acc;
        }, {}),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error loading sections';
      toast.error(message);
    } finally {
      setLoadingSections(false);
    }
  }, []);

  useEffect(() => {
    void loadLayouts();
  }, [loadLayouts]);

  useEffect(() => {
    void loadSections(selectedLayoutId);
  }, [selectedLayoutId, loadSections]);

  const saveSection = async (section: HomeSection, patch: Partial<HomeSection> = {}) => {
    setSavingSectionId(section.id);
    try {
      let nextConfig = section.config;
      if (configDrafts[section.id] !== undefined) {
        nextConfig = JSON.parse(configDrafts[section.id]) as Record<string, unknown>;
      }

      await homeBuilderApi.updateSection(section.id, {
        title: section.title || undefined,
        subtitle: section.subtitle || undefined,
        variant: section.variant || undefined,
        is_enabled: section.is_enabled,
        config: nextConfig,
        ...patch,
      });
      toast.success('Section saved');
      await loadSections(selectedLayoutId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save section';
      toast.error(message);
    } finally {
      setSavingSectionId(null);
    }
  };

  const updateSectionLocal = (id: string, patch: Partial<HomeSection>) => {
    setSections((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const moveSection = async (section: HomeSection, direction: 'up' | 'down') => {
    const currentIndex = sections.findIndex((item) => item.id === section.id);
    if (currentIndex < 0) return;

    const newPosition = direction === 'up' ? currentIndex : currentIndex + 2;
    try {
      await homeBuilderApi.moveSection(section.id, newPosition);
      await loadSections(selectedLayoutId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error moving section';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Home Builder</h1>
          <p className="text-sm text-zinc-500">Crea layouts, reordena secciones y publica directamente a la Store.</p>
        </div>
        <button
          className="rounded bg-black px-3 py-2 text-sm text-white"
          onClick={async () => {
            const name = prompt('Nombre del layout');
            if (!name) return;
            try {
              await homeBuilderApi.createLayout({ name });
              toast.success('Layout creado');
              await loadLayouts();
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Error creating layout';
              toast.error(message);
            }
          }}
        >
          Nuevo layout
        </button>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Layouts</div>
        <div className="flex flex-wrap gap-2">
          {layouts.map((layout) => (
            <button
              key={layout.id}
              className={`rounded border px-3 py-1.5 text-sm ${selectedLayoutId === layout.id ? 'bg-black text-white' : 'bg-white text-zinc-700'}`}
              onClick={() => setSelectedLayoutId(layout.id)}
            >
              {layout.name} {layout.is_active ? '• Publicado' : ''}
            </button>
          ))}
          {!layouts.length && !loadingLayouts ? <p className="text-sm text-zinc-500">Todavía no hay layouts.</p> : null}
          {loadingLayouts ? <p className="text-sm text-zinc-500">Cargando layouts...</p> : null}
        </div>

        {selectedLayout ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded border px-3 py-2 text-sm"
              onClick={async () => {
                try {
                  await homeBuilderApi.updateLayout(selectedLayout.id, { is_active: true });
                  toast.success('Layout publicado en Store');
                  await loadLayouts();
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Error publishing layout';
                  toast.error(message);
                }
              }}
            >
              Publicar en Store
            </button>
            <button
              className="rounded border px-3 py-2 text-sm"
              onClick={() => window.open(`${SITE_URL}/store?previewLayoutId=${selectedLayout.id}`, '_blank')}
            >
              Vista previa en Store
            </button>
            <button
              className="rounded border px-3 py-2 text-sm"
              onClick={async () => {
                try {
                  const clone = await homeBuilderApi.cloneLayout(selectedLayout.id);
                  toast.success(`Layout clonado: ${clone.name}`);
                  await loadLayouts();
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Error cloning layout';
                  toast.error(message);
                }
              }}
            >
              Clonar layout
            </button>
            <button
              className="rounded border border-red-300 px-3 py-2 text-sm text-red-600"
              onClick={async () => {
                if (!confirm(`Eliminar layout "${selectedLayout.name}"?`)) return;
                try {
                  await homeBuilderApi.deleteLayout(selectedLayout.id);
                  toast.success('Layout eliminado');
                  setSelectedLayoutId('');
                  await loadLayouts();
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Error deleting layout';
                  toast.error(message);
                }
              }}
            >
              Eliminar layout
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Secciones</h2>
          <button
            className="rounded bg-black px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedLayoutId}
            onClick={async () => {
              if (!selectedLayoutId) return;
              const type = prompt(`Tipo de sección (${SECTION_TYPES.join(', ')})`, 'HERO_CAROUSEL') || 'HERO_CAROUSEL';
              if (!SECTION_TYPES.includes(type)) {
                toast.error('Tipo de sección no válido');
                return;
              }
              try {
                await homeBuilderApi.createSection(selectedLayoutId, {
                  type,
                  position: sections.length + 1,
                  is_enabled: true,
                  title: type.replaceAll('_', ' '),
                  subtitle: '',
                  variant: '',
                  config: {},
                });
                toast.success('Sección creada');
                await loadSections(selectedLayoutId);
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Error creating section';
                toast.error(message);
              }
            }}
          >
            Añadir sección
          </button>
        </div>

        {loadingSections ? <p className="text-sm text-zinc-500">Cargando secciones...</p> : null}

        <div className="space-y-3">
          {sections.map((section, idx) => (
            <div key={section.id} className="space-y-3 rounded border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{section.title || section.type}</div>
                  <div className="text-xs text-zinc-500">{section.type}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded border px-2 py-1 text-xs" disabled={idx === 0} onClick={() => void moveSection(section, 'up')}>↑</button>
                  <button className="rounded border px-2 py-1 text-xs" disabled={idx === sections.length - 1} onClick={() => void moveSection(section, 'down')}>↓</button>
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => {
                      const next = !section.is_enabled;
                      updateSectionLocal(section.id, { is_enabled: next });
                      void saveSection({ ...section, is_enabled: next });
                    }}
                  >
                    {section.is_enabled ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                    onClick={async () => {
                      if (!confirm('Eliminar esta sección?')) return;
                      try {
                        await homeBuilderApi.deleteSection(section.id);
                        toast.success('Sección eliminada');
                        await loadSections(selectedLayoutId);
                      } catch (error) {
                        const message = error instanceof Error ? error.message : 'Error deleting section';
                        toast.error(message);
                      }
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded border px-2 py-1.5 text-sm"
                  value={section.title || ''}
                  placeholder="Título"
                  onChange={(event) => updateSectionLocal(section.id, { title: event.target.value })}
                />
                <input
                  className="rounded border px-2 py-1.5 text-sm"
                  value={section.subtitle || ''}
                  placeholder="Subtítulo"
                  onChange={(event) => updateSectionLocal(section.id, { subtitle: event.target.value })}
                />
                <input
                  className="rounded border px-2 py-1.5 text-sm"
                  value={section.variant || ''}
                  placeholder="Variant"
                  onChange={(event) => updateSectionLocal(section.id, { variant: event.target.value })}
                />
              </div>

              <textarea
                className="min-h-28 w-full rounded border px-2 py-1.5 text-xs font-mono"
                value={configDrafts[section.id] ?? prettyJson(section.config)}
                onChange={(event) => setConfigDrafts((prev) => ({ ...prev, [section.id]: event.target.value }))}
              />

              <div className="flex justify-end">
                <button
                  className="rounded bg-black px-3 py-1.5 text-xs text-white disabled:opacity-50"
                  disabled={savingSectionId === section.id}
                  onClick={() => void saveSection(section)}
                >
                  {savingSectionId === section.id ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          ))}

          {!sections.length && !loadingSections ? <div className="text-sm text-zinc-500">No hay secciones todavía.</div> : null}
        </div>
      </div>
    </div>
  );
}
