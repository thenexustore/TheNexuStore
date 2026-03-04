'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { HomeLayout, HomeSection, homeBuilderApi } from '@/lib/api/home-builder';
import { SITE_URL } from '@/lib/constants';

const SECTION_TYPES = ['HERO_CAROUSEL', 'CATEGORY_STRIP', 'PRODUCT_CAROUSEL', 'BRAND_STRIP', 'VALUE_PROPS', 'TRENDING_CHIPS'] as const;

type SectionType = (typeof SECTION_TYPES)[number];

function prettyJson(value: Record<string, unknown>) {
  return JSON.stringify(value || {}, null, 2);
}

function safeParseJson(value: string): { ok: true; value: Record<string, unknown> } | { ok: false } {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return { ok: false };
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false };
  }
}

export default function HomeBuilderPage() {
  const [layouts, setLayouts] = useState<HomeLayout[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState('');
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [savingSectionId, setSavingSectionId] = useState<string | null>(null);
  const [configDrafts, setConfigDrafts] = useState<Record<string, string>>({});
  const [loadingLayouts, setLoadingLayouts] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [newLayoutLocale, setNewLayoutLocale] = useState('');
  const [newSectionType, setNewSectionType] = useState<SectionType>('HERO_CAROUSEL');
  const [layoutNameDraft, setLayoutNameDraft] = useState('');
  const [layoutLocaleDraft, setLayoutLocaleDraft] = useState('');
  const [filter, setFilter] = useState('');

  const selectedLayout = useMemo(
    () => layouts.find((layout) => layout.id === selectedLayoutId) || null,
    [layouts, selectedLayoutId],
  );

  const filteredSections = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((section) => {
      const title = (section.title || '').toLowerCase();
      return title.includes(q) || section.type.toLowerCase().includes(q);
    });
  }, [sections, filter]);

  const loadLayouts = useCallback(async () => {
    setLoadingLayouts(true);
    try {
      const data = await homeBuilderApi.layouts();
      setLayouts(data);
      setSelectedLayoutId((prev) => (prev && data.some((layout) => layout.id === prev) ? prev : data[0]?.id || ''));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error loading layouts');
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
      toast.error(error instanceof Error ? error.message : 'Error loading sections');
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

  useEffect(() => {
    setLayoutNameDraft(selectedLayout?.name || '');
    setLayoutLocaleDraft(selectedLayout?.locale || '');
  }, [selectedLayout]);

  const updateSectionLocal = (id: string, patch: Partial<HomeSection>) => {
    setSections((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const saveSection = async (section: HomeSection) => {
    setSavingSectionId(section.id);
    try {
      const parsedConfig = safeParseJson(configDrafts[section.id] ?? prettyJson(section.config));
      if (!parsedConfig.ok) {
        toast.error('Config JSON inválido');
        return;
      }

      await homeBuilderApi.updateSection(section.id, {
        title: section.title || undefined,
        subtitle: section.subtitle || undefined,
        variant: section.variant || undefined,
        is_enabled: section.is_enabled,
        config: parsedConfig.value,
      });
      toast.success(`Sección ${section.title || section.type} guardada`);
      await loadSections(selectedLayoutId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la sección');
    } finally {
      setSavingSectionId(null);
    }
  };

  const createLayout = async () => {
    const name = newLayoutName.trim();
    if (!name) {
      toast.error('Escribe un nombre para el layout');
      return;
    }

    try {
      const created = await homeBuilderApi.createLayout({ name, locale: newLayoutLocale.trim() || undefined });
      toast.success('Layout creado');
      setNewLayoutName('');
      setNewLayoutLocale('');
      await loadLayouts();
      setSelectedLayoutId(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el layout');
    }
  };

  const saveLayoutMeta = async () => {
    if (!selectedLayout) return;
    try {
      await homeBuilderApi.updateLayout(selectedLayout.id, {
        name: layoutNameDraft.trim() || selectedLayout.name,
        locale: layoutLocaleDraft.trim() || undefined,
      });
      toast.success('Datos del layout actualizados');
      await loadLayouts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el layout');
    }
  };

  const createSection = async () => {
    if (!selectedLayoutId) return;

    try {
      await homeBuilderApi.createSection(selectedLayoutId, {
        type: newSectionType,
        position: sections.length + 1,
        is_enabled: true,
        title: newSectionType.replaceAll('_', ' '),
        subtitle: '',
        variant: '',
        config: {},
      });
      toast.success('Sección creada');
      await loadSections(selectedLayoutId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear la sección');
    }
  };

  const duplicateSection = async (section: HomeSection) => {
    if (!selectedLayoutId) return;

    try {
      const parsedConfig = safeParseJson(configDrafts[section.id] ?? prettyJson(section.config));
      if (!parsedConfig.ok) {
        toast.error('No se pudo duplicar: JSON inválido');
        return;
      }

      await homeBuilderApi.createSection(selectedLayoutId, {
        type: section.type,
        position: sections.length + 1,
        is_enabled: section.is_enabled,
        title: `${section.title || section.type} (copia)`,
        subtitle: section.subtitle || '',
        variant: section.variant || '',
        config: parsedConfig.value,
      });
      toast.success('Sección duplicada');
      await loadSections(selectedLayoutId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo duplicar la sección');
    }
  };

  const moveSection = async (section: HomeSection, direction: 'up' | 'down') => {
    const currentIndex = sections.findIndex((item) => item.id === section.id);
    if (currentIndex < 0) return;

    const targetPosition = direction === 'up' ? currentIndex : currentIndex + 2;

    try {
      await homeBuilderApi.moveSection(section.id, targetPosition);
      await loadSections(selectedLayoutId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo mover la sección');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Home Builder</h1>
        <p className="text-sm text-zinc-500">Diseña la home por layouts, publica en Store y administra cada sección con control total.</p>
      </div>

      <section className="rounded-2xl border bg-white p-4 space-y-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-700">Crear layout</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Nombre del layout" value={newLayoutName} onChange={(event) => setNewLayoutName(event.target.value)} />
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Locale opcional (ej: es)" value={newLayoutLocale} onChange={(event) => setNewLayoutLocale(event.target.value)} />
          <button className="rounded-lg bg-black px-3 py-2 text-sm text-white" onClick={() => void createLayout()}>Crear layout</button>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-700">Layouts disponibles</div>
          {loadingLayouts ? <span className="text-xs text-zinc-500">Cargando...</span> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {layouts.map((layout) => (
            <button
              key={layout.id}
              className={`rounded-lg border px-3 py-1.5 text-sm ${selectedLayoutId === layout.id ? 'bg-black text-white' : 'bg-white text-zinc-700'}`}
              onClick={() => setSelectedLayoutId(layout.id)}
            >
              {layout.name} {layout.locale ? `(${layout.locale})` : ''} {layout.is_active ? '• Publicado' : ''}
            </button>
          ))}
          {!layouts.length && !loadingLayouts ? <div className="text-sm text-zinc-500">No hay layouts todavía.</div> : null}
        </div>

        {selectedLayout ? (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              <input className="rounded-lg border px-3 py-2 text-sm" value={layoutNameDraft} onChange={(event) => setLayoutNameDraft(event.target.value)} placeholder="Nombre layout" />
              <input className="rounded-lg border px-3 py-2 text-sm" value={layoutLocaleDraft} onChange={(event) => setLayoutLocaleDraft(event.target.value)} placeholder="Locale" />
              <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => void saveLayoutMeta()}>Guardar datos layout</button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg border px-3 py-2 text-sm"
                onClick={async () => {
                  try {
                    await homeBuilderApi.updateLayout(selectedLayout.id, { is_active: true });
                    toast.success('Layout publicado en Store');
                    await loadLayouts();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'No se pudo publicar el layout');
                  }
                }}
              >
                Publicar
              </button>
              <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => window.open(`${SITE_URL}/store?previewLayoutId=${selectedLayout.id}`, '_blank')}>Vista previa Store</button>
              <button
                className="rounded-lg border px-3 py-2 text-sm"
                onClick={async () => {
                  try {
                    const cloned = await homeBuilderApi.cloneLayout(selectedLayout.id);
                    toast.success(`Layout clonado: ${cloned.name}`);
                    await loadLayouts();
                    setSelectedLayoutId(cloned.id);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'No se pudo clonar el layout');
                  }
                }}
              >
                Clonar
              </button>
              <button
                className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600"
                onClick={async () => {
                  if (!confirm(`¿Eliminar layout "${selectedLayout.name}"?`)) return;
                  try {
                    await homeBuilderApi.deleteLayout(selectedLayout.id);
                    toast.success('Layout eliminado');
                    await loadLayouts();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el layout');
                  }
                }}
              >
                Eliminar
              </button>
            </div>
          </>
        ) : null}
      </section>

      <section className="rounded-2xl border bg-white p-4 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Secciones del layout</h2>
          <div className="flex items-center gap-2">
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Filtrar por título/tipo" value={filter} onChange={(event) => setFilter(event.target.value)} />
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              value={newSectionType}
              onChange={(event) => setNewSectionType(event.target.value as SectionType)}
              disabled={!selectedLayoutId}
            >
              {SECTION_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <button className="rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-50" disabled={!selectedLayoutId} onClick={() => void createSection()}>
              Añadir sección
            </button>
          </div>
        </div>

        {loadingSections ? <div className="text-sm text-zinc-500">Cargando secciones...</div> : null}

        <div className="space-y-3">
          {filteredSections.map((section) => {
            const index = sections.findIndex((item) => item.id === section.id);
            const configIsValid = safeParseJson(configDrafts[section.id] ?? prettyJson(section.config)).ok;

            return (
              <article key={section.id} className="rounded-xl border p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{section.title || section.type}</div>
                    <div className="text-xs text-zinc-500">{section.type} · Posición #{section.position}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${configIsValid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {configIsValid ? 'JSON OK' : 'JSON inválido'}
                    </span>
                    <button className="rounded border px-2 py-1 text-xs" disabled={index === 0} onClick={() => void moveSection(section, 'up')}>↑</button>
                    <button className="rounded border px-2 py-1 text-xs" disabled={index === sections.length - 1} onClick={() => void moveSection(section, 'down')}>↓</button>
                    <button className="rounded border px-2 py-1 text-xs" onClick={() => void duplicateSection(section)}>Duplicar</button>
                    <button
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => {
                        const enabled = !section.is_enabled;
                        updateSectionLocal(section.id, { is_enabled: enabled });
                      }}
                    >
                      {section.is_enabled ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                      onClick={async () => {
                        if (!confirm('¿Eliminar esta sección?')) return;
                        try {
                          await homeBuilderApi.deleteSection(section.id);
                          toast.success('Sección eliminada');
                          await loadSections(selectedLayoutId);
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la sección');
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <input className="rounded-lg border px-3 py-2 text-sm" value={section.title || ''} placeholder="Título" onChange={(event) => updateSectionLocal(section.id, { title: event.target.value })} />
                  <input className="rounded-lg border px-3 py-2 text-sm" value={section.subtitle || ''} placeholder="Subtítulo" onChange={(event) => updateSectionLocal(section.id, { subtitle: event.target.value })} />
                  <input className="rounded-lg border px-3 py-2 text-sm" value={section.variant || ''} placeholder="Variant" onChange={(event) => updateSectionLocal(section.id, { variant: event.target.value })} />
                </div>

                <textarea className="min-h-28 w-full rounded-lg border px-3 py-2 text-xs font-mono" value={configDrafts[section.id] ?? prettyJson(section.config)} onChange={(event) => setConfigDrafts((prev) => ({ ...prev, [section.id]: event.target.value }))} />

                <div className="flex justify-end">
                  <button className="rounded-lg bg-black px-3 py-1.5 text-xs text-white disabled:opacity-50" disabled={savingSectionId === section.id || !configIsValid} onClick={() => void saveSection(section)}>
                    {savingSectionId === section.id ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </article>
            );
          })}

          {!filteredSections.length && !loadingSections ? <div className="text-sm text-zinc-500">No hay secciones para el filtro actual.</div> : null}
        </div>
      </section>
    </div>
  );
}
